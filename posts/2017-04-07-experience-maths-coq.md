---
title: Experiencing Maths via Coq
---

Two years ago, I started working on
Velleman's [How to prove](https://github.com/psibi/how-to-prove)
book. While studying it, I realized that it was easy to
prove
[something wrong and completely miss it](http://staffhome.ecm.uwa.edu.au/~00043886/humour/invalid.proofs.html).

I have been recently studying Coq and proving basic properties
of [Peano numbers](https://wiki.haskell.org/Peano_numbers) using
it. After using it for a month, I feel that for self-studying Maths,
Coq is much better than the traditional way of writing informal
proofs. Also, in some cases, it has helped me to refine my proof. An
example case:

``` coq
Lemma S_injective : forall n m,
    n = m -> S n = S m.
Proof.
  intros n m.
  induction n as [| n'].
  - intros H1.
    rewrite <- H1.
    reflexivity.
  - intros H1.
    rewrite -> H1.
    reflexivity.
Qed.
```

My first attempt in the above problem was to use induction. But after
proving it, I noted that I'm not using induction hypothesis at
all. So in my second attempt, I proved it using case analysis without
induction:

``` coq
Lemma S_injective : forall n m,
    n = m -> S n = S m.
Proof.
  intros n m.
  intros H.
  destruct n as [| n'].
  - simpl. rewrite -> H.
    reflexivity.
  - rewrite -> H.
    reflexivity.
Qed.
```

I think this kind of rapid iteration is very essential in learning
maths. The ability to quickly try out another way of solving it and
having the confirmation that it works is very valuable.
