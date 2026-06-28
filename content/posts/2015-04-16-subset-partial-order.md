+++
title = "Subset partial order"
author = "Sibi"
date = 2015-04-16
path = "posts/2015-04-16-subset-partial-order.html"

[taxonomies]
tags = ["maths"]
+++


What is subset partial order ? Now in my opinion one thing where John
Velleman's fails to explain properly is this. Let's start from the
definition of smallest element to understand it:

Suppose *R* is a partial order on a set *A*, *B* ⊆ *A*, and *b*
∈ *B*. Then *b* is called an *R*-smallest element of *B* if ∀*x*
∈ *B*(*bRx*).

Ok, that's cool. And now there is this family of set on which it is
asked to find the smallest set: *F* = {*X* ⊆ *R* | 5 ∈ *X*
∧ ∀*x*∀*y*((*x* ∈ *X* ∧ *x* < *y*) ⇒ *y* ∈ *X*)}.

Ok, so basically *F* is a set whose elements are subset of *R* with
some property. Now here's where Velleman strikes with his explanation:
"smallest means smallest with respect to the subset partial order".

The answer seems much simpler. Subset partial order means partial
order in which ⊆ is the relation. So in the above case the
smallest in *F* means an element *X* which satifises this property:

∀*Y* ∈ *F* (*X* ⊆ *Y*)

Now, I think what confused me was the initial statement: "when
comparing subsets of some set *A*, then mathematicians use the parial
order *S* = {(*X*,*Y*) ∈ *P*(*A*) × *P*(*A*) | *X* ⊆ *Y*}". And
this made me always figure out the set *S* for any statement related
to smallest element. So is there any set *S* for *F* ?

Now *F* is a set which contains element which itself is a set. So *S*
must be definitely a relation on *P*(*R*). So the definition of *S* goes
like this:

*S* = {(*X*,*Y*) ∈ *P*(*R*) × *P*(*R*) | *X* ⊆ *Y*}

The key thing to understand here is that *F* ⊆ *P*(*R*).
