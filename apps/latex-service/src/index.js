const express = require("express");
const { exec } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { promisify } = require("util");

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3002;

// Parse JSON bodies up to 10MB (for large LaTeX documents)
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Compile LaTeX to PDF
app.post("/compile", async (req, res) => {
  const { latex } = req.body;

  if (!latex) {
    return res
      .status(400)
      .json({ error: "Missing 'latex' field in request body" });
  }

  // Create temp directory for this compilation
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "latex-"));
  const texFile = path.join(tempDir, "document.tex");
  const pdfFile = path.join(tempDir, "document.pdf");

  try {
    // Write LaTeX content to file
    await fs.writeFile(texFile, latex, "utf-8");

    console.log(`[LaTeX] Compiling document in ${tempDir}`);

    // Run pdflatex twice (for references)
    const pdflatexCmd = `pdflatex -interaction=nonstopmode -output-directory="${tempDir}" "${texFile}"`;

    try {
      await execAsync(pdflatexCmd, { timeout: 60000 });
      await execAsync(pdflatexCmd, { timeout: 60000 });
    } catch (error) {
      // pdflatex returns non-zero for warnings too, check if PDF exists
      const pdfExists = await fs
        .access(pdfFile)
        .then(() => true)
        .catch(() => false);

      if (!pdfExists) {
        // Read log file for error details
        const logFile = path.join(tempDir, "document.log");
        let logContent = "";
        try {
          logContent = await fs.readFile(logFile, "utf-8");
          // Extract just the error lines
          const errorLines = logContent
            .split("\n")
            .filter((line) => line.includes("!") || line.includes("Error"))
            .slice(0, 20)
            .join("\n");
          console.error(`[LaTeX] Compilation failed:\n${errorLines}`);
        } catch {
          console.error(`[LaTeX] Compilation failed: ${error.message}`);
        }

        return res.status(500).json({
          error: "LaTeX compilation failed",
          details: logContent.slice(0, 2000),
        });
      }
    }

    // Read the generated PDF
    const pdfBuffer = await fs.readFile(pdfFile);

    console.log(
      `[LaTeX] PDF generated successfully, size: ${pdfBuffer.length} bytes`
    );

    // Send PDF as response
    res.set("Content-Type", "application/pdf");
    res.set("Content-Length", pdfBuffer.length.toString());
    res.send(pdfBuffer);
  } finally {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn(`[LaTeX] Failed to clean up ${tempDir}`);
    }
  }
});

app.listen(PORT, () => {
  console.log(`[LaTeX] Service running on http://localhost:${PORT}`);
});
