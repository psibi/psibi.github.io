+++
title = "Projects"
date = 1970-01-01
path = "projects.html"
+++

Here are some of the open-source projects and tools I've built.

<div class="project-card">
  <h2>Emacs Packages</h2>
  <div class="sub-project">
    <h3><a href="https://github.com/psibi/justl.el" target="_blank" rel="noopener noreferrer">justl.el</a></h3>
    <p>A major mode for driving <a href="https://github.com/casey/just" target="_blank" rel="noopener noreferrer">justfiles</a>. It features transient keymaps for listing and executing recipes, includes full TRAMP support, and is available on <strong>MELPA</strong>.</p>
  </div>
  <div class="sub-project">
    <h3><a href="https://github.com/psibi/dhall-mode" target="_blank" rel="noopener noreferrer">dhall-mode</a></h3>
    <p>A major mode for the <a href="https://dhall-lang.org" target="_blank" rel="noopener noreferrer">Dhall</a> configuration language. It provides syntax highlighting, smart indentation, auto-formatting on save via <code>dhall-format</code>, error diagnostics, and REPL integration. Available on <strong>MELPA</strong>.</p>
  </div>
</div>

<div class="project-card">
  <h2>Haskell Libraries</h2>
  <div class="sub-project">
    <h3><a href="https://github.com/fakedata-haskell/fakedata" target="_blank" rel="noopener noreferrer">fakedata</a></h3>
    <p>A high-performance library for generating realistic fake data (names, addresses, companies, and currencies) in Haskell. Built around a monadic generator with flexible combinators for composing complex randomized values. Available on <strong>Hackage</strong> and <strong>Stackage</strong>.</p>
  </div>
  <div class="sub-project">
    <h3><a href="https://github.com/psibi/streamly-bytestring" target="_blank" rel="noopener noreferrer">streamly-bytestring</a></h3>
    <p>A Haskell library for interoperation between <a href="https://github.com/composewell/streamly" target="_blank" rel="noopener noreferrer">streamly</a> and <code>ByteString</code>. It provides conversion between strict/lazy <code>ByteString</code> and streamly arrays with no overhead for GHC-allocated memory. Available on <strong>Hackage</strong> and <strong>Stackage</strong>.</p>
  </div>
</div>

<div class="project-card">
  <h2>Financial Utilities</h2>

  <div class="sub-project">
    <h3>Credit Card Statement Parsers</h3>
    <p>A suite of Rust CLI tools and WebAssembly (WASM) web applications designed to extract structured CSV data from PDF statements for seamless import into GnuCash.</p>
  </div>

  <div class="sub-project-item" style="margin-left: 20px; margin-bottom: 15px;">
    <strong>Amazon Pay ICICI Card</strong> —
    <a href="https://github.com/psibi/amazon-pay-cc-parser" target="_blank" rel="noopener noreferrer">CLI Source</a> |
    <a href="https://psibi.in/amazon-pay-cc-parser/" target="_blank" rel="noopener noreferrer">Web App</a>
  </div>

  <div class="sub-project-item" style="margin-left: 20px; margin-bottom: 15px;">
    <strong>HDFC Infinia Card</strong> —
    <a href="https://github.com/psibi/hdfc-cc-parser" target="_blank" rel="noopener noreferrer">CLI Source</a> |
    <a href="https://psibi.in/hdfc-cc-parser/" target="_blank" rel="noopener noreferrer">Web App</a>
  </div>

  <div class="sub-project-item" style="margin-left: 20px; margin-bottom: 5px;">
    <strong>Scapia Federal Bank Card</strong> —
    <a href="https://github.com/psibi/federal-cc-parser" target="_blank" rel="noopener noreferrer">CLI Source</a> |
    <a href="https://psibi.in/federal-cc-parser/" target="_blank" rel="noopener noreferrer">Web App</a>
  </div>
</div>

<div class="project-card">
  <h2>Rust / Devops Tools</h2>
  <p>I maintain these projects as part of the <a href="https://github.com/veloxwarp" target="_blank" rel="noopener noreferrer">veloxwarp</a> organization, where I'm a maintainer and core contributor.</p>

  <div class="sub-project">
    <h3><a href="https://github.com/veloxwarp/health-check" target="_blank" rel="noopener noreferrer">health-check</a></h3>
    <p>A health check executable that checks for common server failure modes and sends out notifications to Slack. It is designed to be used as the entrypoint in a Docker container and includes <code>pid1</code> integration for proper signal handling and cleanup of resources.</p>
  </div>

  <div class="sub-project">
    <h3><a href="https://github.com/veloxwarp/amber" target="_blank" rel="noopener noreferrer">amber</a></h3>
    <p>A tool for managing encrypted secrets in version control using public-key cryptography. Secrets are stored in a plain-text YAML file, which keeps diffs minimal, and the primary use case is storing secret values for CI systems.</p>
  </div>

  <div class="sub-project">
    <h3><a href="https://github.com/veloxwarp/pid1-rs" target="_blank" rel="noopener noreferrer">pid1-rs</a></h3>
    <p>A Rust library and binary for correct PID 1 signal handling and zombie process reaping in containerized environments. It forwards signals like <code>SIGTERM</code> to child processes for graceful shutdown and reaps orphaned processes. Available on <strong>crates.io</strong> as <code>pid1</code> and <code>pid1-exe</code>.</p>
  </div>

  <div class="sub-project">
    <h3><a href="https://github.com/veloxwarp/job-watcher" target="_blank" rel="noopener noreferrer">job-watcher</a></h3>
    <p>A Rust library for running and monitoring periodic background tasks. It handles retries, timeouts, heartbeats, and alerting, and exposes a web-based status page. I wrote about its design and production usage in <a href="https://psibi.in/posts/job-watcher/" target="_blank" rel="noopener noreferrer">this blog post</a>.</p>
  </div>
</div>

<div class="project-card">
  <h2>LLM</h2>
  <div class="sub-project">
    <h3><a href="https://psibi.in/deepseek-peak/" target="_blank" rel="noopener noreferrer">DeepSeek Peak-Time Assistant</a></h3>
    <p>A web tool that tracks the DeepSeek API's peak and off-peak pricing windows in real time, showing the current status, countdown, and per-model pricing.</p>
  </div>
</div>
