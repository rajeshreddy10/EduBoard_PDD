/**
 * OpenCode Execution Sandbox Service
 * Safely executes user code snippets in Python, JavaScript, C++, or Java.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class OpencodeExecutionService {
  async execute(code, language, stdin = '') {
    const tmpDir = path.join(os.tmpdir(), `opencode_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      if (language === 'python') {
        const filePath = path.join(tmpDir, 'script.py');
        fs.writeFileSync(filePath, code);
        return await this.runCommand(`python3 "${filePath}" || python "${filePath}"`, tmpDir);
      } else if (language === 'javascript') {
        const filePath = path.join(tmpDir, 'script.js');
        fs.writeFileSync(filePath, code);
        return await this.runCommand(`node "${filePath}"`, tmpDir);
      } else if (language === 'cpp') {
        const filePath = path.join(tmpDir, 'main.cpp');
        const outPath = path.join(tmpDir, 'main.exe');
        fs.writeFileSync(filePath, code);
        const compileRes = await this.runCommand(`g++ "${filePath}" -o "${outPath}"`, tmpDir);
        if (compileRes.exitCode !== 0) return compileRes;
        return await this.runCommand(`"${outPath}"`, tmpDir);
      } else if (language === 'java') {
        const filePath = path.join(tmpDir, 'Main.java');
        fs.writeFileSync(filePath, code);
        const compileRes = await this.runCommand(`javac "${filePath}"`, tmpDir);
        if (compileRes.exitCode !== 0) return compileRes;
        return await this.runCommand(`java -cp "${tmpDir}" Main`, tmpDir);
      } else {
        return {
          stdout: '',
          stderr: `Unsupported language: ${language}`,
          exitCode: 1,
          executionTimeMs: 0
        };
      }
    } finally {
      setTimeout(() => {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
      }, 5000);
    }
  }

  runCommand(cmd, cwd, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      exec(cmd, { cwd, timeout }, (error, stdout, stderr) => {
        const executionTimeMs = Date.now() - startTime;
        if (error) {
          resolve({
            stdout: stdout ? stdout.toString() : '',
            stderr: stderr ? stderr.toString() : error.message,
            exitCode: error.code || 1,
            executionTimeMs
          });
        } else {
          resolve({
            stdout: stdout.toString(),
            stderr: stderr ? stderr.toString() : '',
            exitCode: 0,
            executionTimeMs
          });
        }
      });
    });
  }
}

module.exports = new OpencodeExecutionService();
