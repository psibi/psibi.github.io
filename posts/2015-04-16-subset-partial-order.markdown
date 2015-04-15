---
title: Subset partial order
author: Sibi
---

What is subset partial order ? Now in my opinion one thing where John
Velleman's fails to explain properly is this. Let's start from the
definition of smallest element to understand it:

Suppose $R$ is a partial order on a set $A$, $B \subseteq A$, and $b
\in B$. Then $b$ is called an $R$-smallest element of $B$ if $\forall
x \in B(bRx)$.

Ok, that's cool. And now there is this family of set on which it is
asked to find the smallest set: $F = \{X \subseteq R \mid 5 \in X
\land \forall x \forall y((x \in X \land x < y) \Rightarrow y \in X)\}$.

Ok, so basically $F$ is a set whose elements are subset of $R$ with
some property. Now here's where Velleman strikes with his explanation:
"smallest means smallest with respect to the subset partial order".

The answer seems much simpler. Subset partial order means partial
order in which $\subseteq$ is the relation. So in the above case the
smallest in $F$ means an element $X$ which satifises this property:

$\forall Y \in F (X \subseteq Y)$

Now, I think what confused me was the initial statement: "when
comparing subsets of some set $A$, then mathematicians use the parial
order $S = \{(X,Y) \in P(A) \times P(A) \mid X \subseteq Y\}$". And
this made me always figure out the set $S$ for any statement related
to smallest element. So is there any set $S$ for $F$ ?

Now $F$ is a set which contains element which itself is a set. So $S$
must be definitely a relation on $P(R)$. So the definition of $S$ goes
like this:

$S = \{(X,Y) \in P(R) \times P(R) \mid X \subseteq Y\}$

The key thing to understand here is that $F \subseteq P(R)$.
