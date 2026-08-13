+++
title = "job-watcher: Monitoring background jobs in Rust"
author = "Sibi"
date = 2026-08-26

[taxonomies]
tags = ["rust", "tokio", "monitoring"]
+++

## Introduction

If your service runs background jobs (eg: a block indexer, a
leaderboard refresher, a stream consumer), you eventually need to
answer a simple question:

**Is this thing actually working?**

Knowing that the process is alive isn't enough. A background job can
be stuck, failing repeatedly, taking much longer than it used to, or
quietly retrying forever while the rest of the application serves
requests normally. None of that shows up in a process liveness check.

I've run into this problem repeatedly over the last few years. At my
workplace, we've been using [job-watcher](https://github.com/veloxwarp/job-watcher) in
production for roughly three years, across several clients and
different kinds of background jobs.

[job-watcher](https://github.com/veloxwarp/job-watcher) is a small Rust library that packages
the mechanics you'd otherwise write by hand: a loop with a timer, a
retry counter, a way to tell whether things are still working, and an
alert when they aren't. What I find most useful about it is that
**job-watcher owns the lifecycle of the jobs it monitors**. Because it
runs the jobs itself, it knows things that an external monitoring
system would otherwise have to reconstruct: whether a task is
currently running, how long it has been running, how many retries it
has used, what its last result was, and whether an error is a new
failure or the same failure we've already seen.

I'll walk through the design below, and how we use it in production.

## History

The library started life as application code written by my colleague
[Michael Snoyman](https://www.snoyman.com/) as part of a larger application we were
working on. When I started working for another client, we ran into the
same requirement again, and that's what motivated me to split
Michael's code out into a standalone crate. We've been using and
iterating on the library for the last 3 years or so, for various
clients, adapting it to our needs as we go.

## The problem

In the blockchain world, a block is a batch of transactions, and an
indexer is a background job that watches for new blocks and keeps a
remote store up to date with them. Say your service runs such an
indexer every minute:

```text
             ┌──────────────┐
             │    indexer   │
             └──────┬───────┘
                    │
                    ▼
             fetch new blocks
                    │
                    ▼
              update database
```

The initial implementation looks trivial:

```rust
loop {
    run_indexer().await?;
    tokio::time::sleep(Duration::from_secs(60)).await;
}
```

But in production, you quickly run into new questions:

* What happens when the indexer fails?
* Should we retry immediately or wait?
* How many times should we retry?
* How do we know that the indexer is stuck rather than merely slow?
* How do we expose its current state to operators?
* How do we alert when it fails?
* How do we avoid sending an alert every time the same retry fails?
* How do we know when it has recovered?

You can build all of this yourself, of course. The problem is that the
answers end up being nearly identical for every background job, and
you keep rewriting the same boilerplate in every service.

## The design

The core abstraction in `job-watcher` is a watched task. Its lifecycle
looks roughly like this:

```text
                    ┌─────────────┐
                    │  not started│
                    └──────┬──────┘
                           │
                           ▼
                       running
                       /     \
                  success    failure
                    │           │
                    ▼           ▼
                 healthy     retrying
                                │
                         retries exhausted
                                │
                                ▼
                              failed
```

The actual implementation has more state than this, particularly
around distinguishing first failures, repeated failures, new errors,
and recovery. That distinction turns out to be important for
alerting.

The watcher handles the mechanics around the task. Your task
implementation only needs to provide the actual work:

```rust
struct Indexer;

impl WatchedTask<MyApp> for Indexer {
    async fn run_single(
        &mut self,
        _app: Arc<MyApp>,
        _heartbeat: Heartbeat,
    ) -> Result<WatchedTaskOutput> {
        // do the actual work here
        Ok(WatchedTaskOutput::new("Indexed 1000 blocks"))
    }
}
```

The task returns either an error or a `WatchedTaskOutput`.

## A minimal application

Wiring this up involves three pieces.

First, define the application context:

```rust
#[derive(Clone)]
struct MyApp;

impl WatcherAppContext for MyApp {
    fn title(&self) -> String {
        "My App Status".to_owned()
    }

    fn environment(&self) -> Option<String> {
        Some("production".to_owned())
    }

    fn build_version(&self) -> Option<String> {
        Some(env!("CARGO_PKG_VERSION").to_owned())
    }

    fn watcher_config(&self) -> WatcherConfig {
        let mut config = WatcherConfig::default();

        config.retries = 3;
        config.delay_between_retries = 5;

        config.tasks.insert(
            "indexer".to_owned(),
            TaskConfig {
                delay: Delay::ConstantSecs(60),
                out_of_date: Some(120),
                retries: None,
                delay_between_retries: None,
            },
        );

        config
    }

    fn triggers_alert(
        &self,
        _label: &TaskLabel,
        _selected: Option<&TaskLabel>,
    ) -> bool {
        true
    }

    fn show_output(&self, _label: &TaskLabel) -> bool {
        true
    }

    fn notifier_config(&self) -> Option<job_watcher::NotifierConfig> {
        None
    }
}
```

Then implement the task itself, as above.

Finally, register it with a `WatcherBuilder`:

```rust
#[tokio::main]
async fn main() -> Result<()> {
    let app = Arc::new(MyApp);
    let mut builder = WatcherBuilder::new(app);

    builder.watch_periodic(TaskLabel::new("indexer"), Indexer)?;

    let listener = TcpListener::bind("0.0.0.0:8080").await?;
    builder.wait(listener).await
}
```

With those pieces in place, the watcher runs the task and exposes its
status on port 8080.

One deliberate design choice: every registered task must have a
corresponding configuration entry. If you register a task without
configuring it, the builder panics rather than silently using an
implicit default. This is a fail-fast choice: forgetting to configure
a production task should be an application-development error, not
something that quietly changes its runtime behaviour.

## Retries

A failed background job doesn't necessarily mean that something is
broken. Most of the failures I've seen here are transient: an RPC
endpoint that's briefly down, a database that's unavailable for a few
seconds, a flaky network request.

So `job-watcher` distinguishes an individual failure from an
exhausted retry policy.

You can configure global retry defaults:

```rust
config.retries = 3;
config.delay_between_retries = 5;
```

and override them for individual tasks. The delay can also be
configured in several ways: constant seconds, constant milliseconds,
random ranges, or no delay at all.

Retries are handled by the watcher rather than being repeated in every
task implementation. When `run_single` returns an error:

```rust
Err(error)
```

the watcher decides whether to retry, how long to wait, and when to
give up and fire an alert.

## Detecting stuck jobs

Failures are relatively easy to detect. Stuck jobs are harder.

Say an indexer normally completes in a few seconds, but one invocation
gets stuck waiting for an external service. There's no error to
trigger the retry logic. The task is simply still running.

For this, a task can have an `out_of_date` threshold:

```rust
out_of_date: Some(120),
```

The watcher checks the current run: if it has been going on longer
than the threshold, the task is flagged as out of date on the status
page. Setting `out_of_date` also enables a hard timeout on each run:
anything that takes longer than 180 seconds is killed and treated as a
failure, so a stuck task doesn't hang forever.

Note that the timeout is fixed at 180 seconds and is independent of
the `out_of_date` threshold. The threshold only decides when a run
*looks* stale on the status page; the timeout is the safety net that
terminates runs exceeding the hard limit.

It would be nice if the 180 second timeout were configurable per task;
I'd like to add that in a future version of the library.

For jobs where long runtimes are expected, the `out_of_date` threshold
needs to be chosen accordingly. An indexer that normally completes in
ten seconds needs a very different threshold from a job that
legitimately runs for several minutes.

## Heartbeats

Sometimes knowing that a task is running isn't enough.

A long-running job can report progress through a `Heartbeat`:

```rust
heartbeat.set_status(format!("Indexed {i} blocks")).await;
```

The status page can then show that progress while the task is still
running. Instead of seeing only `indexer: running`, an operator sees
something more useful:

```text
indexer: running
Indexed 184,000 blocks
```

The task still owns the actual work. The watcher just gives it a way
to surface its current status.

## Continuous background tasks

Not every background job is periodic. A stream consumer might look
more like this:

```rust
loop {
    consume_next_message().await?;
}
```

For these jobs, `job-watcher` provides
`watch_background_with_status`:

```rust
async fn consume_forever(
    _app: Arc<MyApp>,
    heartbeat: Heartbeat,
) -> Result<Infallible> {
    let mut i = 0;

    loop {
        heartbeat
            .set_status(format!("Consumed {i} messages"))
            .await;

        i += 1;
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
}
```

Here the watcher isn't imposing a periodic schedule on the task. It
just keeps track of a continuously running background future and
exposes its status.

## The status page

Once the watcher owns the task lifecycle, exposing the information it
has collected is an obvious next step. The watcher runs an Axum server
using the listener passed to `wait`, and provides three endpoints:

```text
/status
/status/{label}
/healthz
```

The status endpoints support several representations based on the
`Accept` header:

* HTML for humans
* JSON for machines
* plain text for simple integrations

The HTML page includes application information such as the
environment, build version, and process uptime, followed by the status
of each task. For each task, it can show the current state, last
result, run duration, success count, retry count, error count, and any
heartbeat/status information.

![job-watcher status page](/images/posts/job-watcher/status_page.png)

For external monitoring, the useful bit is the HTTP status code. If a
task is currently in an alerting state, `/status` returns HTTP 500
instead of 200.

That gives us a very simple integration boundary:

```text
job state
    │
    ▼
/status
    │
    ├── 2xx → healthy
    │
    └── 500 → unhealthy
```

A monitoring system just has to check whether the endpoint returns
`2xx` (healthy) or `500` (unhealthy). The watcher doesn't need to know
which monitoring system will consume that endpoint.

## Making the status endpoint reflect task health

A health endpoint that only says whether the process itself is alive
isn't very useful for a service whose primary responsibility is
running background jobs.

A traditional liveness check might return 200 even when the process is
alive, the HTTP server is up, but the indexer is failing. From the
perspective of the system's actual purpose, the service isn't healthy.

So `job-watcher` treats an alerting task as part of the application's
health state. `/status` then works both for humans looking at a
browser and for infrastructure that understands HTTP health checks.

## Alerting

The same task state that drives the status page can drive
notifications. We don't want an alert for every failed attempt.

Say an indexer fails three times with `connection refused` each time.
Three Slack messages wouldn't be useful.

Instead, `job-watcher` models alerting as transitions in a small state
machine:

* `FirstFailure`: the task has failed for the first time.
* `Down`: a previously successful task is now failing.
* `NewFailure`: the task was already failing, but the error changed.
* `Recovered`: a failing task has started succeeding again.

Repeated identical failures are deduplicated. That gives us a useful
property:

```text
healthy
   │
   │ failure
   ▼
  down ──────────────┐
   │                 │
   │ same error      │ success
   │                 │
   ▼                 ▼
no new alert       recovered
```

The `Down` vs `NewFailure` distinction has been particularly useful in
practice. A persistent failure is worth knowing about, but a
*different* failure may indicate that the situation has changed and
deserves another notification.

The library also supports expiring task output with
`WatchedTaskOutput::set_expiry(duration)`. This lets a task mark
output as something that should stop alerting after a specified
period, which is useful for transient conditions that shouldn't page
someone indefinitely.

Currently the built-in notifier is Slack because that's what we use.
The notifier configuration is an enum and can be extended with
additional notification mechanisms.

![Slack alert on task failure](/images/posts/job-watcher/task_failure_slack_alert.png)

Recovery notifications are sent separately:

![Slack alert on task recovery](/images/posts/job-watcher/task_recover_slack_alert.png)

## Comparison with Prometheus

This is probably the question I get asked most often.

There is certainly overlap. Prometheus can monitor jobs, alert on
failures, and integrate with Slack and other notification systems. I
don't think `job-watcher` replaces Prometheus.

For me, the difference comes down to where the knowledge about the job
lives. Prometheus observes the metrics that an application exposes;
`job-watcher` is the component actually running the background jobs.

With Prometheus, you can expose metrics for all of this, but you have
to build the instrumentation and the alerting semantics yourself. For
a small Rust application with a handful of background jobs, having the
component that runs the jobs also track that lifecycle is often
simpler.

The trade-off looks roughly like this:

|                           | job-watcher                                 | Prometheus + Alertmanager       |
| ------------------------- | ------------------------------------------- | ------------------------------- |
| Where it runs             | Embedded in the Rust application            | Separate monitoring services    |
| What it knows             | Task lifecycle and execution state          | Metrics exposed by applications |
| Alert logic               | Built-in task state machine                 | PromQL-based alerting rules     |
| History                   | Current state and process-lifetime counters | Long-term time-series data      |
| Alert channels            | Slack currently                             | Many receivers                  |
| Status page               | Built-in                                    | Usually Grafana/Alertmanager    |
| Additional infrastructure | None to deploy for the watcher itself       | Monitoring stack to operate     |

There's one failure mode worth calling out: if the entire
`job-watcher` process dies, it cannot report its own death. That's why
I see the two approaches as complementary.

Prometheus is useful when you need long-term metrics, cross-service
correlation, dashboards, or sophisticated alerting. `job-watcher` is
useful when you want a background job to own its own execution state
and expose that state directly.

## Production usage

In production, we couple `job-watcher` with Cloudflare health checks.
Do note that you have to have a Pro plan ($25 per month) for that.

The architecture is deliberately simple:

```text
                ┌─────────────────┐
                │ background jobs │
                └────────┬────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ job-watcher │
                  └──────┬──────┘
                         │
                      /status
                         │
                         ▼
                  ┌─────────────┐
                  │  Cloudflare │
                  │ health check│
                  └──────┬──────┘
                         │
                  ┌──────┴──────┐
                  ▼             ▼
                Slack       PagerDuty
```

As described in the status page section, `/status` returns a 500 the
moment any task is in an alerting state. The Cloudflare health check
polls the status page every 60 seconds and only accepts `2xx`
responses, so it flips to "unhealthy" exactly when one of our jobs is
failing. We also configure it to expect the text "Status" in the
response body, so we can be sure we're talking to the actual status
page and not some other endpoint on the domain.

The health check settings give us debouncing for free. We require
three consecutive failed checks before Cloudflare treats the endpoint
as unhealthy, so with a 60 second interval it has to observe roughly
three minutes of sustained failure before anything fires, which
filters out transient blips. And we configure the notification policy
to fire on both the unhealthy and the healthy transitions, so we get
notified not only when a job goes down but also when it recovers,
mirroring the `Recovered` alert that `job-watcher` itself knows about.

## Where `job-watcher` fits

I don't think this is a universal replacement for a monitoring stack.

If you have dozens of services, need months of historical metrics,
want to correlate failures across systems, or need sophisticated alert
routing, Prometheus and Alertmanager (or another dedicated monitoring
system) are much better suited to that problem.

But if you have a Rust application with a small number of important
background jobs, having the component that runs them also track their
operational state is a reasonable trade-off.

It's a small library rather than another service to deploy. When I
register a task:

```rust
builder.watch_periodic(
    TaskLabel::new("indexer"),
    Indexer,
)?;
```

I don't need to think about retries, timeouts, status reporting, or
alerts; the watcher handles all of that:

```text
                 ┌──────────────────────┐
                 │       job code       │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │     job-watcher      │
                 │                      │
                 │ retries              │
                 │ execution state      │
                 │ timeout              │
                 │ heartbeat            │
                 │ result               │
                 │ alert state          │
                 └──────────┬───────────┘
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
              /status                Slack
                 │
                 ▼
          external health
             checking
```

That's the abstraction I've found useful across different applications
and clients. The alternative is to implement pieces of this separately
in every service: a timer here, a retry loop there, a Prometheus gauge
somewhere else, an alerting rule, and some custom status endpoint.
Individually, none of that is particularly hard. You just end up
writing it over and over. At its core, `job-watcher` gives an
application one clear answer:

> **Are my background jobs running, succeeding, and making progress?**

Because that answer is exposed over HTTP, you can hook it up to
whatever monitoring setup you prefer.

One thing I'd like to explore is exposing an optional
Prometheus-style metrics endpoint from `job-watcher` and seeing how it
works in practice. It would let us feed the task state into Prometheus
without giving up the parts of the design that work well.
