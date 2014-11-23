---
title: Going dired!
author: Sibi
---

I have planned to get into the habit of using dired mode regularly. So
started reading the
[manual](http://www.gnu.org/software/emacs/manual/html_node/emacs/Dired.html#Dired)
of Emacs and these are the essential keybindings which are important
(according to me):

* d : Flag file for deletion
* u : Remove deletion flag
* x : Delete files flagged for deletion
* f : Visit file
* e : Like f
* o : Like f but opens another window
* v : Opens file in read mode
* ^ : Read parent directory
* m : Mark file
* \* m : Mark current or region of files
* U : Remove all marks
* \* t : Toggle all marked and unmarked files
* \* % regex : Mark files with regexp
* C-/ : Undo changes

File operations:

* C : Copy file
* D : Delete file
* H : Hard link
* S : Soft link
* M : Change Mode
* O : Change Owner
* T : Touch
* Z : Toggle compress

Shell Commands:

* ! : Run shell command
* & : Run shell command in async fashion.

Ok, so these are all the key bindings I found useful after reading
half of the manual for dired. I will update this post in case I find
something more useful.
