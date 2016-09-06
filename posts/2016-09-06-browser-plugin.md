---
title: Foray into plugin writing
---

So, this week I took stab at authoring plugins for a minor inconvenience I
had during browsing. The end result is
[stackgo](https://github.com/psibi/stackgo).

Stackgo is a plugin to automatically redirect Haddock library pages to
Stackage pages when went via search engines like Google/Bing etc. For
cases, where the package hasn't been yet added to Stackage - it will
just take it to the original Hackage haddock pages.

I have also modified the behavior slightly in some cases when a page
is traversed via Hackage or Stackage
directly. [Yell it here](https://github.com/psibi/stackgo/issues), if
you find it unintuitive and we can try to find a solution.

## Installation links

<a href="https://addons.mozilla.org/en-US/firefox/addon/stackgo">![Firefox Addon link](../images/posts/firefox.png)</a><a href="https://chrome.google.com/webstore/detail/ojjalokgookadeklnffglgbnlbaiackn">![Google Chrome webstore link](../images/posts/chrome-logo.png)</a>

## Experience

Publishing to Google Chrome involved a
[$5 developer signup fee](https://developer.chrome.com/webstore/publish#pay-the-developer-signup-fee)
whereas for firefox, it was free. The plugin was written using
[WebExtensions](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/What_are_WebExtensions)
which is a cross browser system for developing add-ons. While I'm
happy with having to maintain a single codebase for different
platforms, it was still a pain. I specifically had to
[add "tabs" permissions](https://github.com/psibi/stackgo/commit/c70a31dfcaefc94a9ffeb9c359dd3bd559edef05)
and write code in a different way because
[originUrl](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onBeforeSendHeaders#Chrome)
was not supported in Chrome. Maybe, things will become better in
future. This plugin is expected to work in Opera, although I
haven't tested or published in their ecosystem. Feel free to test/publish there (and report back to me!).


Also, thanks to Christopher Allen for testing and spreading words about it.

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">Browser plugins to automatically redirect Hackage doc pages to Stackage:<a href="https://t.co/A9iQUJ9Xz7">https://t.co/A9iQUJ9Xz7</a></p>&mdash; red in tooth &amp; λ (@bitemyapp) <a href="https://twitter.com/bitemyapp/status/771450997642104832">September 1, 2016</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>
