Enhancing Stack for Yesod

Yesod's development server uses [Stack](http://haskellstack.org/) to
recompile the project on file changes. The usage of Stack in Yesod was
incorporated
[last November by Michael](http://www.yesodweb.com/blog/2016/11/new-yesod-devel-server). Internally,
`yesod devel` monitors the output from the stack process to see if
it's in compilation mode. If it emits some output, (other than
`ExitFailed` or `ExitSuccess`), it assumes that the build is in
compile mode and your web application will go to the refresh mode.

The above flow works good, but it has some scenarios where it can make
your web application permanently go into the refresh mode state. 



https://github.com/yesodweb/yesod/issues/1384
