require('dotenv').config()

import * as fs from 'fs'
import { GraphQLClient, request } from 'graphql-request'
import axios from 'axios'
import stringStripHtml from 'string-strip-html'

/* const client = new GraphQLClient(process.env.CANVAS_ENDPOINT_GQL, {
  headers: {
    Authorization: `Bearer ${process.env.CANVAS_TOKEN}`
  }
}) */

const query = `{
  course(id: "486804") {
    assignmentsConnection {
      nodes {
        submissionsConnection {
          nodes {
            commentsConnection {
              nodes {
                comment
              }
            }
          }
        }
      }
    }
  }
}`

const query2 = `{
    allCourses {
      id,
      name,
      courseCode,
      state,
    }
  }`

/* client.request(query).then(data => {
  try {
        fs.writeFile('output.json', JSON.stringify(data), err => {
      if (err) throw err
      console.log('The file has been saved!')
    })
      } catch (error) {
    console.error(error)
  }
}) */

async function getCanvasData(path: string) {
  try {
  return axios({
    method: 'get',
    url: `https://uvu.instructure.com${path}`,
    headers: {
      Authorization: `Bearer ${process.env.CANVAS_TOKEN}`
    }
  })
} catch(error) {
  console.error(`Could not get requested data: ${error}`)
}
}

async function getCourseIDs() {
  try {
    const allCourses = await getCanvasData(`/api/v1/courses?per_page=100`)
    return allCourses?.data.reduce((results: any[], course: any) => {
      let crs_cd = course.course_code
      if (crs_cd.includes('2018') || crs_cd.includes('2019')) {
        results.push({
          course_code: course.course_code,
          id: course.id
        })
      }
      return results
    }, [])
  } catch (error) {
    console.error(`getCourseIDs error: ${error}`)
  }
}

async function getDiscussionForumIDArray(courseIDs: any) {
  try {
    return Promise.all(
      courseIDs.flatMap(async ({ id }: any) => {
      const forumsArray = await getCanvasData(
        `/api/v1/courses/${id}/discussion_topics?per_page=100`
      )
      return forumsArray?.data.reduce((results: any[], forum: any) => {
        if(forum.id) {
        results.push({
          course_id: id,
          forum_id: forum.id
        })
      }
        return results
      }, [])
    })
    )
  } catch (error) {
    console.error(`getDiscussionForumIDArray error: ${error}`)
  }
}

async function getEntriesByForumIDs(forumIDs: any) {
  try {
    return Promise.all(
    forumIDs.map(async ({ course_id, forum_id }: any) => {
     const topicsArray = await getCanvasData(
        `/api/v1/courses/${course_id}/discussion_topics/${forum_id}/entries?per_page=100`
      )
        return topicsArray?.data
    })
    )
  } catch (error) {
    console.error(`getEntriesByForumIDs error: ${error}`)
  }
}

/* try {
        topicsArray.data.forEach(async (topic: any) => {
          console.log(id, topic.title)
          const entryArray = await getCanvasData(
            `/api/v1/courses/${id}/discussion_topics/${topic.id}/entries?per_page=100`
          )
          //console.log(entryArray.data.length, entryArray.data)
          if (entryArray.data.length !== 0) {
            //console.log(entryArray.data)
             entryArray.data.forEach(
              (entry: {
                user_id: string
                updated_at: string
                message: string
              }) => {

                //console.log(stringStripHtml(entry.message))
                entries.push({
                  user_id: entry.user_id,
                  updated_at: entry.updated_at,
                  message: stringStripHtml(entry.message)
                })
              }
            ) 
          }
        })
      } catch (error) {
        console.error(`Problem getting discussion topics: ${error}`)
      } */

async function main() {
  const select_courses = await getCourseIDs()
  console.log(select_courses.length, select_courses.flat())

  const select_forums = await getDiscussionForumIDArray(select_courses)
  
  //console.log(select_forums?.flat().length, select_forums?.flat())

  const select_entries = await getEntriesByForumIDs(select_forums?.flat())
  console.log(select_entries?.flat())
  try {
          fs.appendFile(
            'selectEntries.json',
            JSON.stringify(select_entries?.flat()),
            err => {
              if (err) throw err
              console.log('The file has been saved!')
            }
          )
        } catch (error) {
          console.error(error)
        } 
}

main().catch((error) => {
  console.log(`Got an error on main: ${error}`)
})
