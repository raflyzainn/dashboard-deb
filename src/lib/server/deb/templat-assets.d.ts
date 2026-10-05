/** The mail merge templates in static/templat are imported as asset URLs and read on the server with read() from $app/server. */
declare module '*.docx?url' {
  const src: string;
  export default src;
}
