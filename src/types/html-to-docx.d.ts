declare module "html-to-docx" {
  interface DocxOptions {
    table?: { row?: { cantSplit?: boolean } };
    footer?: boolean;
    pageNumber?: boolean;
    font?: string;
    fontSize?: number;
    margins?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    title?: string;
    [key: string]: unknown;
  }

  function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString: string | null,
    documentOptions?: DocxOptions,
    footerHTMLString?: string | null
  ): Promise<ArrayBuffer>;

  export default HTMLtoDOCX;
}
