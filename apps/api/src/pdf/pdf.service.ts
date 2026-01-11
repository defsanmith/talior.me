import { Injectable, Logger } from "@nestjs/common";
import { EditableResume } from "@tailor.me/shared";
import { generateResumeLatex } from "./resume.template";

const LATEX_SERVICE_URL =
  process.env.LATEX_SERVICE_URL || "http://localhost:3002";

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Generates a PDF from the resume data by calling the LaTeX microservice
   * @param resume The editable resume data
   * @returns PDF buffer
   */
  async generatePdf(resume: EditableResume): Promise<Buffer> {
    // Generate LaTeX content
    const latexContent = generateResumeLatex(resume);

    this.logger.debug("Sending LaTeX to compilation service...");

    try {
      const response = await fetch(`${LATEX_SERVICE_URL}/compile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latex: latexContent }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error(
          `LaTeX service error: ${response.status} - ${JSON.stringify(errorData)}`
        );
        throw new Error(
          errorData.error || `LaTeX compilation failed: ${response.statusText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);

      this.logger.debug(
        `PDF generated successfully, size: ${pdfBuffer.length} bytes`
      );

      return pdfBuffer;
    } catch (error: any) {
      if (error.code === "ECONNREFUSED") {
        this.logger.error(
          `Cannot connect to LaTeX service at ${LATEX_SERVICE_URL}. Is it running?`
        );
        throw new Error(
          "LaTeX service unavailable. Please ensure the latex-service container is running."
        );
      }
      throw error;
    }
  }

  /**
   * Generates just the LaTeX source without compiling
   * Useful for debugging
   */
  generateLatexSource(resume: EditableResume): string {
    return generateResumeLatex(resume);
  }
}
