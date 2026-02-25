// Allow importing CSS files as modules in TypeScript
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
