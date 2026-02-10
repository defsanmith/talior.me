export default class Router {
  static CREATE = "/create";
  static PROFILE = "/profile";
  static PROFILE_SKILLS = "/profile/skills";
  static PROFILE_EDUCATION = "/profile/education";
  static PROFILE_EXPERIENCE = "/profile/experience";
  static PROFILE_PROJECTS = "/profile/projects";
  static SETTINGS = "/settings";
  static DASHBOARD = "/";
  static JOBS = "/jobs";

  static LOGIN = "/login";

  static jobDetails(jobId: string) {
    return `${Router.JOBS}/${jobId}`;
  }
}
