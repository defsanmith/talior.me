export default class Router {
  static CREATE = "/create";
  static PROFILE = "/profile";
  static SETTINGS = "/settings";
  static DASHBOARD = "/";
  static JOBS = "/jobs";

  static jobDetails(jobId: string) {
    return `${Router.JOBS}/${jobId}`;
  }
}
