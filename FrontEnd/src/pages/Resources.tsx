import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
const fields = {
  schedules:[['course','Course'],['title','Course title'],['day','Day','select',['Sunday','Monday','Tuesday','Wednesday','Thursday']],['start_time','Starts','time'],['end_time','Ends','time'],['room','Room'],['instructor','Instructor'],['section','Section']],
  announcements:[['title','Title'],['body','Message','textarea'],['date','Publish date','date'],['priority','Priority','select',['high','medium','low']],['posted_by','Posted by'],['expires','Expires','date']],
  assignments:[['course','Course'],['course_title','Course title'],['title','Assignment title'],['description','Description','textarea'],['assigned_date','Assigned date','date'],['deadline','Deadline','date'],['submission_platform','Submission platform'],['status','Status','select',['pending','submitted','graded','late']],['marks','Marks','number']],
} as const
const toFields = (values: ReadonlyArray<readonly [string, string, string?, (readonly string[])?]>) => values.map(([key,label,type,options]) => ({key,label,type:type as never,options:options ? [...options]:undefined}))
const schedulesConfig: ResourceConfig<'schedules'> = {resource:'schedules',title:'Class schedule',description:'Keep every course, room, and instructor in sync.',singular:'class',fields:toFields(fields.schedules),primary:x=>`${x.course} · ${x.section}`,secondary:x=>x.title,meta:x=>[x.day,`${x.start_time}–${x.end_time}`,x.room,x.instructor]}
const announcementsConfig: ResourceConfig<'announcements'> = {resource:'announcements',title:'Announcements',description:'Publish timely campus updates with clear priorities.',singular:'announcement',fields:toFields(fields.announcements),primary:x=>x.title,secondary:x=>x.body,meta:x=>[`${x.priority} priority`,x.posted_by,`${x.date} → ${x.expires}`]}
const assignmentsConfig: ResourceConfig<'assignments'> = {resource:'assignments',title:'Assignments',description:'Track coursework, deadlines, marks, and progress.',singular:'assignment',fields:toFields(fields.assignments),primary:x=>x.title,secondary:x=>`${x.course} · ${x.course_title}`,meta:x=>[`Due ${x.deadline}`,x.status,`${x.marks} marks`,x.submission_platform]}
export function Schedules(){return <ResourcePage config={schedulesConfig}/>}
export function Announcements(){return <ResourcePage config={announcementsConfig}/>}
export function Assignments(){return <ResourcePage config={assignmentsConfig}/>}
