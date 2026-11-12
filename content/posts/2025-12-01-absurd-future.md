+++
title = "Introducing absurd-future: Handling Infallible Futures in Rust"
description = "Introducing absurd-future, a new Rust crate for handling futures that never return."
date = 2025-12-01
author = "Sibi Prabakaran"
path = "posts/2025-12-01-absurd-future.html"

[taxonomies]
tags = ["rust", "async", "future", "infallible"]
+++

> **Mirrored from FP Complete.** The original FP Complete site is no longer available, so this post is mirrored here. [Read the archived original on the Wayback Machine](https://web.archive.org/web/20260607103103/https://academy.fpblock.com/blog/absurd-future/).

FP Block has released a new crate, [`absurd-future`](https://crates.io/crates/absurd-future). This small utility helps solve a specific but tricky problem in asynchronous Rust: how to handle futures that never return a value.

This code was originally part of [Kolme's codebase](https://github.com/fpco/kolme). We refactored and published it as a separate crate as we were running into similar use cases for our other projects.

For a more detailed guide that motivates the need for these types, with some discussion of type theory and Haskell, please see our post on [how to use Rust's never type to write cleaner async code](https://academy.fpblock.com/blog/rust-never-type-async-code/). For a short guide on how to use the `absurd-future` crate, read on!

## The Problem: Never-Returning Futures

In asynchronous programming, it's common to have tasks that are designed to run forever. Think of a web server listener, a background job processor, or a metrics collector. In Rust, the logical return type for a function or future that never completes is the "never" type, `!`, or its stable counterpart, `std::convert::Infallible`.

This works well until you need to manage these tasks alongside other tasks that are also designed to run forever, but might eventually fail. A great tool for managing multiple tasks is `tokio::task::JoinSet`, which allows you to spawn several futures and wait for any of them to complete. However, `JoinSet` has one requirement: all tasks spawned into it must have the same return type.

So, what happens when you have:
1. A background task that runs forever and returns `Infallible`.
2. Another background task that runs forever but can fail and returns `Result<Infallible, Error>`.

You can't put both into the same `JoinSet` due to the type mismatch.

## The Solution: `absurd-future`

This is where `absurd-future` comes in. It's a simple future adapter that takes a future returning an uninhabited type (like `Infallible`) and transforms its type signature to *any other type* you need, without changing its behavior.

This is safe because a value of an uninhabited type can never be constructed. Since the original future can never produce such a value, we can safely claim it produces a value of any other type, because that code path is unreachable.

## How to Use It: An Example with `JoinSet`

Let's walk through a practical example from the crate's documentation. Here, we have two tasks we want to run in a `JoinSet`.

First, let's define our two tasks.

`task_one` is a simple background task that prints a message every second and never stops. Its return type is `Infallible`.

```rust
use std::convert::Infallible;
use std::time::Duration;

async fn task_one() -> Infallible {
    loop {
        println!("Hello from task 1");
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
}
```

`task_two` is a task that also loops but is designed to fail after a few iterations. Its return type is
`Result<Infallible>`, indicating it can either run forever successfully or return an error.

```rust
use anyhow::{bail, Result};
use std::time::Duration;

async fn task_two() -> Result<Infallible> {
    let mut counter = 1;
    loop {
        println!("Hello from task 2");
        counter += 1;
        tokio::time::sleep(Duration::from_secs(1)).await;
        if counter >= 3 {
            bail!("Counter is >= 3")
        }
    }
}
```

Now, let's see how we can run these together using `JoinSet`. The `JoinSet` will be of type
`JoinSet<Result<Infallible>>` to match the return type of `task_two`.

```rust
use absurd_future::absurd_future;
use tokio::task::JoinSet;
use anyhow::{bail, Result};
use std::convert::Infallible;

// ... task_one and task_two definitions from above ...

async fn main_inner() -> Result<()> {
    let mut join_set = JoinSet::new();

    // Spawn task_two directly, its type matches.
    join_set.spawn(task_two());

    // We can't spawn task_one directly due to a type mismatch.
    // join_set.spawn(task_one()); // <-- This would not compile!

    // Wrap task_one with absurd_future to change its type.
    join_set.spawn(absurd_future(task_one()));

    // Now, wait for a task to complete.
    match join_set.join_next().await {
        Some(result) => match result {
            Ok(res) => match res {
                // This branch is impossible, as Infallible can't be created.
                Ok(_res) => bail!("Impossible: Infallible witnessed!"),
                // This is the expected path: task_two fails.
                Err(e) => {
                    join_set.abort_all();
                    bail!("Task exited with {e}")
                }
            },
            Err(e) => { // Task panicked
                join_set.abort_all();
                bail!("Task exited with {e}")
            }
        },
        None => { // No tasks were in the set
            bail!("No tasks found in task set")
        }
    }
}
```

In `main_inner`, we create our `JoinSet`. We can spawn `task_two` without any issues. However, if we
tried to spawn `task_one`, we'd get a compile error because `Infallible` does not match
`Result<Infallible>`.

By wrapping `task_one` with `absurd_future(task_one())`, we adapt its return type. The compiler infers
that we want to change it from `Infallible` to `Result<Infallible>`, and now it can be added to the
`JoinSet`.

When we `join_next()`, we only expect to see the error from `task_two`. The `Ok(_res)` arm is logically
unreachable, as `task_one` will never return and `task_two` only returns an `Err`.

## Get Started

`absurd-future` is a small, focused library that can help you write cleaner and more type-safe
asynchronous code when dealing with never-returning tasks.

You can find the crate on [crates.io](https://crates.io/crates/absurd-future) and the source code on
[GitHub](https://github.com/fpco/absurd-future). The documentation is available on [docs.rs](https://docs.rs/absurd-future).

Give it a try and let us know what you think!
