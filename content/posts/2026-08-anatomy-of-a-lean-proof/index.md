---
title: "Anatomy of a Lean Proof for Software Engineers"
date: "2026-08-10"
draft: true
toc: true
---

## Intro

I recently worked through a problem from a theory of computation textbook that asked me to prove a property of a language using finite automata.
The informal proof is a simple constructive proof where you build an automaton and show that it recognizes the language.
This is kind of similar to program verification, so I thought it'd be interesting to see what it takes to formalize the proof.
Lean is a good choice for this, because its [Mathlib](https://lean-lang.org/use-cases/mathlib/) has all the theorems for the problem.

After finishing the formal proof, I decided to write it up, because I think it provides software engineers with good insight into what it takes to formally prove properties of a system.

I tried to make this post accessible.
If you're comfortable with a modern statically typed programming language (such as TypeScript or Rust), binary arithmetic, basic propositional logic, and inductive proofs, you should be able to follow along.

## Background: DFAs & Regular Languages

*Feel free to skip to the [next section](#the-problem) if you're comfortable with DFAs and regular languages.*

Finite automata provide a theoretical model of computation with fixed memory.
Besides theory, finite automata also have important practical applications. 
For example, finite automata are relevant for parsers and regular expressions, where a [bug](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/) once took a significant portion of the internet down.

### Deterministic Finite Automaton (DFA)

A **deterministic finite automaton** (DFA) is a machine with a fixed, finite set of states that reads its input one symbol at a time, left to right, updating its state with each symbol using a deterministic transition function.
After the last symbol, the machine either sits in an *accepting* state (input is accepted) or not (input is rejected).

If you've ever written a simple regular expression like `-?[0-9]+`, then you've constructed a DFA. 
This regex matches integer literals like `12` and `-123` and the corresponding DFA looks like this (the arrows are annotated with the symbols that lead to the next state):

![DFA figure for integer literal regex DFA](./assets/int-lit-regex-dfa.svg)

This DFA has four states:
- **Start:** this is where we start before processing the first character. Since the start state is not an accepting state, we reject the empty string.
- **Sign:** we move to the sign state when we encounter the `-` character in the start state. We can skip the sign state and jump directly to digits from start, since the sign character is optional (`-?`). If we're in this state at the end of the string, then we reject the string.
- **Digits:** we move from start or sign to digits when we encounter a digit character (`[0-9]`). If we're in the digits state and encounter a digit character again, then we stay in the digits state. The digits state is the only accepting state of the DFA. If we're in this state after we've processed the input string, then the DFA accepts the string.
- **Dead:** we get into this state if we encounter any other character than a digit (unless it's a negative sign at the start). If we're in the dead state at the end of the string, then the DFA rejects the string. Once we're in the dead state, we stay in it, so the dead state in this DFA is a *sink*.

The set of input **symbols** to the machine is defined by the set $\Sigma$. 
In our regex example, $\Sigma = \left\{-, 0, 1, 2, \ldots, 9\right\}$.

### Regular Languages

A **language** is just a set of strings, also called **words**, and a language is called **regular** if some DFA accepts the strings in it. 
Recognizing regular languages is the class of decision problems solvable with a constant amount of memory in the input size.

Regular languages have useful closure properties: the union, intersection, complement, and (important for us) **reversal** of a regular language is regular.

The standard way to prove that a language is regular is to build a DFA and show that it accepts exactly that language.

We can describe a language $A$ with set-builder notation: 
$$A = \bigl\{\, w \in \Sigma^{*} \bigm| P(w) \,\bigr\}$$


$\Sigma^{*}$ means the set of strings that are created by all possible concatenations of symbols in $\Sigma$ and $P(w)$ is the logical proposition that the string $w$ is well-formed.

Let's apply this notation to our regex example: `-?[0-9]+`. Then $\Sigma^{*}$ contains strings like `""`, `"123"`, `"-111"`, `"2-625-"`, etc. and $P(w)$ can be defined as "$w$ is not empty and only its first character can be a negative sign". 


## The Problem

The problem that we're going to solve is from the [Introduction to the Theory of Computation,](https://math.mit.edu/~sipser/book.html) 3rd ed. by Michael Sipser:

> **1.32** Let
>
> $$\Sigma_3 = \left\{ \begin{bmatrix}0\\0\\0\end{bmatrix}, \begin{bmatrix}0\\0\\1\end{bmatrix}, \begin{bmatrix}0\\1\\0\end{bmatrix}, \ldots, \begin{bmatrix}1\\1\\1\end{bmatrix} \right\}.$$
>
> $\Sigma_3$ is the set of all height-3 columns of 0s and 1s, so a string over
> $\Sigma_3$ determines three rows of bits. Reading each row as a binary number,
> define
>
> $$B = \bigl\{\, w \in \Sigma_3^{*} \bigm| P(w)  \,\bigr\}$$
>
> where $P(w)$ is the proposition that the bottom row of $w$ equals the sum of the top two rows.
>
> Show that $B$ is regular. (Hint: it is easier to work with $B^{\mathcal{R}}$.)

The problem defines an unusual alphabet.
Instead of regular characters like `[a-z]`, the alphabet is made up of columns of three bits.
So instead of a language that consists of strings like `"apple"`, `"banana"`, etc., the language consists of two-dimensional bit strings like

```
011
001
100
```

where the first column is the first "character" and so on.

The rule to decide whether a string is in the language is to add the first two rows of the string and check whether they match the third.

For example, the following string is in the language:

```
011 # x row: first term is 3 in decimal
001 # y row: second term is 1 in decimal
100 # z row: sum is 4 which is equal to 3 + 1
```

But the following string is not in the language:

```
01 # x row: first term is 1 in decimal
00 # y row: second term is 0
11 # z row: sum is 3 which is not equal to 1 + 0
```

While a language like this may look weird at first, it's actually a lot easier to write a program that recognizes this language as opposed to a program that recognizes a natural language, since we just need to check the equation

$$ x + y = z$$

to determine whether a string is in the language. 
The challenge is that we need to do this with a fixed amount of memory for arbitrarily long strings.

## The Solution

The trick is to remember how you add numbers by hand: you work from the least significant digit to the most significant, and the only thing you carry from one column to the next is the carry.

But a DFA reads left to right, and the problem presents the numbers most significant bit first.
So we don't recognize $B$ directly. 
Instead we build a DFA to recognize its reversal $B^R$ which is the same strings that are in $B$ written backwards, so the machine sees the least significant column first.

If we can build a DFA to recognize $B^R$, then we can conclude that $B^R$ is a regular language.
Since $B^R$ reversed is $B$, we can use the closure property of the reversal of regular languages to conclude that $B$ is regular as well which completes the solution.

### Adder Arithmetic

When doing the arithmetic column-by-column, we compute the sum bit at each step as follows: 

$$x_i \oplus y_i \oplus c_{in} = z_i$$ 

where $x, y$ are the addend bits, $z$ is the sum bit, $i$ denotes the ordinal of the current column, and $c_{in}$ is the input carry from the previous step.
We compute the output carry denoted $c_{out}$ for the next step as follows:

$$c_{out} = (x_i \wedge y_i) \vee \left( c_{in} \wedge (x_i \oplus y_i) \right)$$
This means that there is a carry either if both terms are $\mathtt{1}$ or there was an input carry and at least one of the terms is $\mathtt{1}$. Note that a simpler way to compute $c_{out}$ is to check if at least two of $x_i$, $y_i$ and $c_{in}$ are $\mathtt{1}$ (we'll make use of this in the Lean proof).

### Adder DFA

With this in mind, here is the DFA that recognizes $B^R$:

![DFA figure for the 1-bit full adder recognizing B reversed](./assets/carry-dfa.svg)

The adder DFA has three states:

- **Carry 0:** We're in this state if the carry is 0 before processing the next column. This is both the starting and the accepting state, since a leftover carry at the end would mean the sum overflowed the bottom row. 
- **Carry 1:** We're in this state if the carry is 1 before processing the next column. This state is non-accepting, since a word ending here has a carry left over, so the sum overflowed. But unlike the dead state we can still leave it, since a $\left[\begin{smallmatrix}\mathtt{0}\\\mathtt{0}\\\mathtt{1}\end{smallmatrix}\right]$ column absorbs the pending carry and takes us back to carry 0. 
- **Dead:** We end up in this state if the sum doesn't match. This is a sink state meaning it's terminal.


The arrows are annotated with the columns that lead from the input state to the output state.
If the figure looks confusing at first, the following examples will hopefully make it clearer.

### Example 1

Let's trace the first example from the problem through the DFA:

```
011 # x row: 3 in decimal
001 # y row: 1 in decimal
100 # z row: 4 in decimal
```

The DFA recognizes $B^R$, so it reads the columns backwards.
Unrolling the run turns it into a straight line with one copy of the state per step.

![The run of the carry automaton on the accepted word, unrolled into a chain of states](./assets/carry-dfa-run-accept.svg)

The run ends in carry 0 (the accepting state), so the reversed word is in $B^R$. 
Due to the closure property of reversal, the original word is in $B$ as well.

Note that the machine passes *through* the non-accepting carry 1 state twice.
Had the word stopped after either of the first two columns, it would have been rejected, since $\mathtt{1} + \mathtt{1} = \mathtt{0}$ and $\mathtt{11} + \mathtt{01} = \mathtt{00}$ are both wrong without somewhere to put the carry.

### Example 2

Now the second example, which should be rejected:

```
01 # x row: 1 in decimal
00 # y row: 0 in decimal
11 # z row: 3 in decimal
```

![The run of the carry automaton on the rejected word, unrolled into a chain of states ending in dead](./assets/carry-dfa-run-reject.svg)

The first column is fine on its own ($\mathtt{1} + \mathtt{0}$ really is $\mathtt{1}$) so the machine can't tell anything is wrong yet.
But the second column fails: with no carry pending, $\mathtt{0} + \mathtt{0}$ must produce $\mathtt{0}$, but the bottom row claims $\mathtt{1}$.
The run ends outside the accepting state, so the second example is rejected.

Note that since the dead state is a sink state, the string would get rejected even if there were more valid columns after the second column.


## The Lean Proof

Our goal is to show that the language $B$ from the [problem](#the-problem) is [regular.](#regular-languages)
As discussed earlier, in order to show that a language is regular, we need to build a [DFA](#deterministic-finite-automaton-dfa) and show that it accepts the language.

The Lean proof will consist of three parts:

1. A **specification** of the language $B$.
2. An executable **implementation** of the [adder DFA](#adder-dfa).
3. A **proof** showing that the implementation matches the specification.

Lean's [Mathlib](https://lean-lang.org/use-cases/mathlib/) has first class support for formal languages and DFAs, so we will just need to instantiate structures from the library for the specification and the implementation.

For the proof, we'll have to do more work, but Mathlib will be helpful here as well, as it contains the theorem that regular languages are closed under reversal, which will save a lot of work.
The proof will contain some unfamiliar syntax, but under the hood it's just a program.
In fact, the proof is accepted if the program compiles.

Below is a figure laying out the components of the program. The full code can be found on [Github.](https://github.com/agostbiro/my-lean/tree/main/theory-of-computation/TheoryOfComputation/Chapter1_Problem32)

![Diagram of the three layers of the Lean file and the dependencies between their definitions and theorems](./assets/proof-structure.svg "The specification and the implementation meet in the proof layer")


### The Specification

The alphabet from the problem is made up of columns of three bits. 
We can represent one column with a tuple of three booleans in Lean:

```lean
abbrev Sigma3 := Bool × Bool × Bool
```

Then we use [`Mathlib.Computability.Language`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Computability/Language.html#Language) to define $B$:

```lean
def B : Language Sigma3 :=
  { wBE | row3BE wBE = row1BE wBE + row2BE wBE }
```

`Language` is a generic implementation of formal languages that comes with standard operations and associated theorems.
We instantiate it using our alphabet `Sigma3` and the predicate for membership in $B$ (recall that a language is a set of strings).

`wBE` is a big-endian word in the language, which is a list of `Sigma3` values, i.e. a 2D list of binary values with three rows.
`rowNBE` is a function that selects the nth row of the 2D list from the top and turns it into a natural number using a big-endian interpretation.[^1]
So the predicate is just 

$$z = x + y$$

from our earlier examples.

If you've used programming languages with set comprehensions, the set builder syntax might look familiar, but we're not constructing a collection here.
`Language` is just a `Set` under the hood and `Set` in Lean is a function that tests whether an element is in the set.[^2]
So our definition of $B$ gets unrolled to a function definition under the hood:

```lean
def B : List Sigma3 → Prop :=
  fun wBE => 
      row3BE wBE = row1BE wBE + row2BE wBE
```

The function has one argument of type `List Sigma3` which is a generic list that holds `Sigma3` objects. 
This is pretty standard so far, but the return type is more interesting.
In a typical programming language, you'd expect a membership test to return a boolean.
But the return value here is `Prop` which is the type of all propositions in Lean (a proposition is something that may or may not have a proof).

So how do membership tests work then?
The expression `wBE ∈ B` applies the function to `wBE`, which gives back a proposition.
In Lean a proposition is itself a type, and its values are proofs of the proposition.
So instead of evaluating `wBE ∈ B` to a boolean, we prove it: to show that a word is in the language, we construct a value of the proposition's type. 
And to show that a word isn't in the language, we construct a value of the negated proposition.
This way, a set membership test ends up being a type check, not a computation at runtime.

### The Implementation

We first define the [states of the DFA](#adder-dfa) (carry 0, carry 1, dead) as a sum type:

```lean
inductive DfaState where
  | carry (c : Bool)
  | dead
  deriving DecidableEq, Fintype
```

We could define the same state using an enum in Rust or a discriminated union in TypeScript.
Lean's `inductive` type does a bit more though than a recursive sum type in these languages: it also generates some scaffolding that makes it easy to use the type in proofs. 
We'll see more of this later.

Now onto the derives. 
`DecidableEq` just says this type supports full equality checks (same as deriving `Eq` in Rust), but `Fintype` is something that's only available in proof assistants.
It says that the type has finitely many values and it creates a list of them plus a proof that the list is complete.
Deriving `Fintype` lets us claim later on that the language can be recognized with constant memory, therefore it's regular.

Next, we define the transition function of the DFA:

```lean
def dfaStep : DfaState → Sigma3 → DfaState
  | .dead, _ => .dead
  | .carry c, (x, y, z) =>
      if z = (x ^^ y ^^ c) then  -- ^^ is XOR
        .carry (Bool.atLeastTwo x y c)
      else
        .dead
```

The function has two arguments, the current state and the next symbol, and returns the next state.

As we saw earlier, the dead state is a sink, so it always maps to itself.
If we're in the carry state, and the adder equation checks out, then the next state is the value of carry out.
Otherwise we enter the dead state.

`dfaStep` is just a regular function that we can execute, so let's run a quick sanity check.

![A step of the carry automaton: the column (1,1,0) takes the machine from carry 0 to carry 1](./assets/carry-dfa-carry-step.svg)

```lean
#eval dfaStep (.carry false) (true, true, false)  
-- Prints: DfaState.carry true
```

If we want to make sure this holds, we can turn it into an example:

```lean
example :
    dfaStep (.carry false) (true, true, false) = .carry true := by
  decide
```

The `example : ... := by decide` structure in Lean is kind of like a unit test, except it's a proof that's checked at compile time.

Finally, we use the generic [`Mathlib.Computability.DFA`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Computability/DFA.html#DFA) structure from Mathlib to complete the implementation.
We give it the transition function and define the start and accept states:

```lean
def adderDFA : DFA Sigma3 DfaState where
  step := dfaStep
  start := .carry false
  accept := {.carry false}
```

`DFA` integrates with `Mathlib.Computability.Language` which will make it easy to prove later on that our language is regular.

`DFA` also comes with [`evalFrom`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Computability/DFA.html#DFA.evalFrom), which runs the machine step-by-step from a given starting state over a list of symbols.
We can use it to evaluate [Example 2](#example-2) as a compile-time check:

![The run of the carry automaton on the rejected word, unrolled into a chain of states ending in dead](./assets/carry-dfa-run-reject.svg)

```lean
example :
    adderDFA.evalFrom (.carry false)
      [(true, false, true), (false, false, true)] = .dead := by
  decide
```

The run starts from `.carry false` and ends in `.dead` as expected.

### How Proofs Work

Before we dig into the proof of the solution in the [next section,](#the-proof) let's review how proofs work in Lean using the `dfaStep` example:

```lean
example :
    dfaStep (.carry false) (true, true, false) = .carry true := by
  decide
```

The `by` keyword switches Lean into tactic mode which is an imperative way of generating proofs. 
`decide` is a tactic that proves a proposition by reducing its decision procedure[^3] in the type checker.[^4]
It doesn't actually run the compiled code, but for our purposes you can think of `decide` as proof by evaluation.

The proof generated by `decide` under the hood is equivalent to the following:[^5]

```lean
abbrev StepEndsWithCarry : Prop := 
  dfaStep (.carry false) (true, true, false) = .carry true

example : StepEndsWithCarry :=
  (of_decide_eq_true (Eq.refl true))
```

Notice that there is no `by` after the `:=` this time.
This means that it's a term mode proof where we have to construct a term whose type is the proposition to close the proof.

A term is a value of a type, just like `3` is a value of `Nat` which is the type of natural numbers. 
A proof of a proposition is a term whose type is that proposition, so writing the proof is like constructing a value of that type.
In this view, a proposition is true when its type has at least one value, and false when it provably has none. 
A false proposition is like Rust's empty `enum` or TypeScript's `never`: since the type has no values, there is nothing you could write as a proof.

In the example above the proposition is `StepEndsWithCarry` and the term which serves as the proof is:

```lean
(of_decide_eq_true (Eq.refl true))
```

To understand the proof, we have to figure out why the type of this term is the proposition.
`of_decide_eq_true` is a theorem [from](https://leanprover-community.github.io/mathlib4_docs/Init/Prelude.html#of_decide_eq_true) the standard library whose type is:

```lean
decide p = true → p
```

It states that if evaluating the decision procedure for proposition `p` returns `true`, then `p` holds.
It's a pretty nifty theorem that lets us prove a proposition by simply evaluating it (the proof of the theorem is beyond the scope of this post).

The arrow indicates that `decide p = true → p` is a function type with one argument of type `decide p = true` and the return type is `p`.
So if we can pass an argument of type `decide StepEndsWithCarry = true` to `of_decide_eq_true` then we get ourselves a value of our proposition `StepEndsWithCarry`, which is a proof of the same proposition.

But how can we construct a term of type `decide StepEndsWithCarry = true` for `of_decide_eq_true`?

The answer is a bit convoluted.
The argument we're passing to `of_decide_eq_true` is `Eq.refl true` which has type `true = true`.
At first glance, this has nothing to do with our proposition.

The magic happens when Lean checks `true = true` against `decide StepEndsWithCarry = true`.
The type checker unfolds `decide StepEndsWithCarry`, which evaluates `dfaStep` and compares the result to `.carry true`, and this reduces to `true`. 

Lean considers two types equal if they reduce to the same term, so `decide StepEndsWithCarry = true` and `true = true` are the same type, and `Eq.refl true` is accepted as a proof of both.

And now back to our *regular* programming.

### The Proof

As discussed earlier, in order to prove that the language $B$ is regular, we need to first show that the adder DFA accepts the reverse of the language, $B^{\mathcal{R}}$. 
We can then use the closure property of the reversal of regular languages to prove that $B$ is regular.
This is readily available as a theorem [from Mathlib,](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Computability/NFA.html#Language.isRegular_reverse_iff) but we'll have to do some work to show that the adder DFA recognizes $B^{\mathcal{R}}$. 

Mathlib's [definition](https://github.com/leanprover-community/mathlib4/blob/bbcd1968ee6950abe88b85dba6995da346c4b2a8/Mathlib/Computability/DFA.lean#L353-L355) of regular languages boils down to this:[^6]

```lean
def IsRegular (L : Language T) : Prop :=
  ∃ σ [Fintype σ], ∃ M : DFA T σ, M.accepts = L
```

The `(L : Language T)` argument means that the language can have any type of symbols.
The return type is again `Prop`.

`∃ σ [Fintype σ]` says that there is a finite number of states.
The interesting part is `∃ M : DFA T σ, M.accepts = L` which says that a language is regular if the language accepted by some DFA over those states equals the language.
So when does a DFA accept a language?

The language a DFA accepts in Mathlib is [defined](https://github.com/leanprover-community/mathlib4/blob/bbcd1968ee6950abe88b85dba6995da346c4b2a8/Mathlib/Computability/DFA.lean#L123-L124) similarly to this:[^7]

```lean
def accepts : Language α := 
  { word | M.evalFrom M.start word ∈ M.accept }
```

This means that the language that the DFA accepts is the set of words for which evaluating the DFA from the starting state leads to an accepting state.

Our job is now to prove that the set that is `B.reverse` is equal to the set that is `adderDFA.accepts`.
This is formalized in our proof as follows:

```lean
theorem adderDFA_accepts_B_reverse : adderDFA.accepts = B.reverse := by
  ...
```

The way we're going to prove this is by showing that the adder DFA computes the same equation that is the membership check for `B.reverse` which is defined as follows:

```lean
B.reverse = { w | w.reverse ∈ B }
```

`B` reads its rows most significant bit first with the `rowNBE` functions. 
Reading the reversed string big-endian is the same as reading the original string least significant bit first.
In other words, while we interpret bit strings big-endian for `B`, we interpret them as little-endian for `B.reverse`. 
The membership test for `B.reverse` is therefore equivalent to:[^8]

```lean
{ wLE | row1LE wLE + row2LE wLE = row3LE wLE }
```

The challenge in proving `adderDFA_accepts_B_reverse` is that the definition of the language is descriptive while the adder DFA is prescriptive and describes intermediate steps.

#### Run Invariant

The DFA has finitely many states, but it can process arbitrarily long strings.
The natural way to prove properties of such a process is by induction.

In order to prove a proposition by induction we need an induction hypothesis that holds for all steps.
One idea for the induction hypothesis could be to propose the following equivalence

```lean
adderDFA.evalFrom (.carry 0) wLE = .carry 0 ↔
  row1LE wLE + row2LE wLE = row3LE wLE
```

which reads as

> Running the adder DFA over a (little-endian) word $w$ starting with carry $0$ ends in state carry $0$ if and only if
>
> $$\mathrm{row}_1(w) + \mathrm{row}_2(w) = \mathrm{row}_3(w)$$
>
> where the rows are read as little-endian binary numbers.

This is what we need ultimately. 
We always start from carry $0$ and the only accepting state is also carry $0$, and the right-hand side of the equivalence matches the membership test for `B.reverse`.
But as we saw earlier, carry $1$ can be a valid intermediate state as well, so this statement is too weak to serve as an induction hypothesis. 

We cannot restrict our induction hypothesis to a certain carry value, but we still need to establish a connection between carry in and carry out.
We can accomplish this by extending the right-hand side of the equivalence to include $c_{in}$ and $c_{out}$ terms: 

```lean
  row1LE wLE + row2LE wLE + carryIn = 
    row3LE wLE + carryOut * 2 ^ wLE.length
```

Or with mathematical notation to make it easy to see that it's just the definition of binary addition:

$$\sum_{i=0}^{n-1} x_i 2^i + \sum_{i=0}^{n-1} y_i 2^i + c_{in} = \sum_{i=0}^{n-1} z_i 2^i + c_{out} \cdot 2^n$$

The full equivalence now becomes

```lean
adderDFA.evalFrom (.carry carryIn) wLE = .carry carryOut ↔
  row1LE wLE + row2LE wLE + carryIn = 
    row3LE wLE + carryOut * 2 ^ wLE.length
```

which reads as
> Running the adder DFA over a (little-endian) word $w$ starting with carry $c_{\mathrm{in}}$ ends in state $c_{\mathrm{out}}$ if and only if
>
> $$\mathrm{row}_1(w) + \mathrm{row}_2(w) + c_{\mathrm{in}} = \mathrm{row}_3(w) + c_{\mathrm{out}} \cdot 2^{|w|}$$
>
> where the rows are read as little-endian binary numbers.

For members of `B.reverse` where the starting and ending carry are both 0, this is equivalent to our first attempt, but it holds for intermediate steps as well where both carry in and carry out may be non-zero.

#### Run Invariant Proof

Here is the run invariant as a theorem, with the proof left out for now:

```lean
def RunEndsWithCarry (carryIn : Bool) (wLE : List Sigma3) (carryOut : Bool) : Prop :=
  adderDFA.evalFrom (.carry carryIn) wLE = .carry carryOut

def WordAddsWithCarry (carryIn : Bool) (wLE : List Sigma3) (carryOut : Bool) : Prop :=
  row1LE wLE + row2LE wLE + carryIn.toNat
    = row3LE wLE + carryOut.toNat * 2 ^ wLE.length

lemma run_invariant (wLE : List Sigma3) (carryIn carryOut : Bool) :
    RunEndsWithCarry carryIn wLE carryOut ↔
      WordAddsWithCarry carryIn wLE carryOut := by
  ...
```

Both sides of the equivalence get their own name, so that the lemma reads as "the run from `carryIn` ends in `carryOut` if and only if the word adds up with these carries".
`RunEndsWithCarry` and `WordAddsWithCarry` are definitions whose type is `Prop`, so they're statements rather than values.
`RunEndsWithCarry` is the left-hand side of the equivalence from the previous section, and `WordAddsWithCarry` is the right-hand side.
The only difference from that equation is `.toNat`, which converts a boolean into `0` or `1` so that the carries can take part in the arithmetic (`.toNat` will be omitted in the following code blocks for brevity).

Notice that the theorem has arguments like a function.
In fact a theorem is essentially a function: its arguments are the variables the statement talks about, its type is the proposition, and its body is the proof.
So we have a parameterized theorem that we'll have to prove for all possible values of its arguments. 
But we will only use it later on in the proof of `adderDFA_accepts_B_reverse` with both carries set to `false` which corresponds to the definition of the language `B`:

```lean
run_invariant (carryIn := false) wLE (carryOut := false)
```

The proof is by induction on the word `wLE` which has type `List Sigma3`.
Induction on a list requires proving the statement for the empty list, and then proving that if it holds for some list, it also holds for that list with one more element added to the front.
Since every list can be built from the empty list by adding elements to the front, these two steps cover all lists.

```lean
  induction wLE generalizing carryIn with
  | nil => ...
  | cons column columnsLE induction_hypothesis => ...
```

Lean in tactic mode works by creating goals that need to be proved.
A goal is a statement that Lean still needs a proof of.
Each tactic transforms or closes the current goal.

The initial goal is the theorem that we're trying to prove, but we cannot do that directly, so we use the `induction` tactic which gives us a goal to prove for each constructor of the list.
`nil` is the constructor for the empty list, and `cons` is the constructor that prepends an element to an existing list.
In the `cons` case we get to name the first column, the remaining columns, and the induction hypothesis, which is the run invariant assumed to be true for the remaining columns.

The `generalizing carryIn` part is important.
Without it, the induction hypothesis would only talk about runs that start with the same `carryIn` as the run we are looking at.
But in the inductive step we peel off the first column, and the run over the remaining columns starts with the carry that the first column produced, which is not necessarily the same value that `carryIn` had.
`generalizing` makes the induction hypothesis hold for every starting carry.
The ending carry is the same for the whole run, so `carryOut` can stay fixed.

##### Base Case

Let's have a look at the proof of the base case (when the DFA is running over an empty word).
Recall the run invariant:

```lean
RunEndsWithCarry carryIn wLE carryOut ↔ 
  WordAddsWithCarry carryIn wLE carryOut
```

Let's focus on what happens on the left-hand side of the equivalence first.
Unfolding `RunEndsWithCarry` gives:

```lean
adderDFA.evalFrom (.carry carryIn) wLE = .carry carryOut
```

`DFA.evalFrom` is [defined](https://github.com/leanprover-community/mathlib4/blob/bbcd1968ee6950abe88b85dba6995da346c4b2a8/Mathlib/Computability/DFA.lean#L74-L75) in Mathlib as follows:

```lean
def evalFrom (s : σ) : List α → σ :=
  List.foldl M.step s
```

`List.foldl` just returns the initial value if the input list is empty, and the initial value we provide to `DFA.evalFrom` is `.carry carryIn`, so in the base case we have 

```lean
.carry carryIn = .carry carryOut
```

on the left-hand side of the equivalence.

Next, let's see what happens on the right-hand side in the base case.
Unfolding `WordAddsWithCarry` gives the equation:

```lean
row1LE wLE + row2LE wLE + carryIn = 
  row3LE wLE + carryOut * 2 ^ wLE.length
```

`rowNLE` returns 0 for the empty list, so we have 

```lean
0 + 0 + carryIn = 0 + carryOut * 2 ^ 0
```

or simply 

```lean
carryIn = carryOut
```

So in the base case we need to prove that

```lean
.carry carryIn = .carry carryOut ↔
  carryIn = carryOut
```

Since there are only four cases, we can prove this by exhaustion.
The equivalence holds if both sides have the same truth value in every row of the table:

| `carryIn` | `carryOut` | `.carry carryIn =`<br>`.carry carryOut` | `carryIn = carryOut` | `↔` |
|:---------:|:----------:|:----------------------------------:|:--------------------:|:---:|
| F   | F    | T                               | T                    | T |
| F   | T     | F                              | F                   | T |
| T    | F    | F                              | F                   | T |
| T    | T     | T                               | T                    | T |

The same argument in Lean:

```lean
lemma run_invariant (wLE : List Sigma3) (carryIn carryOut : Bool) :
    RunEndsWithCarry carryIn wLE carryOut ↔
      WordAddsWithCarry carryIn wLE carryOut := by
  induction wLE generalizing carryIn with
  | nil =>  -- base case
    cases carryIn <;> cases carryOut <;>
      simp [
          RunEndsWithCarry, WordAddsWithCarry, 
          row1LE, row2LE, row3LE, 
          valueLE, 
          row1, row2, row3, 
          DFA.evalFrom
      ]
  | cons column columnsLE induction_hypothesis => ...
```

The `cases` tactic splits a goal into one goal per constructor of a type, so `cases carryIn` gives us two goals, one with `carryIn` replaced by `false` and one with `true`.
The `<;>` combinator runs the tactic on its right on every goal produced by the tactic on its left, so `cases carryIn <;> cases carryOut` leaves us with four goals.
`simp` then closes each of them.

`simp` is one of the most commonly used tactics in Lean.
It rewrites the goal using a database of simplification rules plus the definitions and lemmas that we pass to it in the square brackets, and it closes the goal if the goal ends up as something trivially true.
Here it unfolds `RunEndsWithCarry`, `WordAddsWithCarry`, the row values and `evalFrom`, evaluates the arithmetic, and is left with goals like `false = false`, which it knows how to close.

##### Inductive Step

Recall that in the inductive step we need to prove that, if the induction hypothesis holds for some list, then it also holds for that list with one more element added to the front.

In the inductive step, the word is `cons column columnsLE` which is the list created by prepending `column` to `columnsLE`. 
Lean has an infix operator `::` for prepending to a list, so we can write `column :: columnsLE`.

The induction hypothesis holds by assumption for `columnsLE`, but we need to prove the invariant for the whole word.
We'll do this by introducing an intermediate carry after the first step of the DFA that runs on the first column (which is the least significant bit of the word).
Then we rearrange the equation from `WordAddsWithCarry` to show that the arithmetic checks out.

These are the high level steps:

1. On the DFA side, split the run into its first step and the run over the remaining columns and join them with an intermediate carry.
2. Turn the first step of the DFA into arithmetic. This is the adder equation for a single column.
3. Turn the run over the remaining columns into arithmetic using the induction hypothesis.
4. On the arithmetic side, show that the equation for the whole word splits into the equation for the least significant bit and the equation for the remaining bits.

![The lemmas used in the inductive step of the run invariant and how they feed into it](./assets/run-invariant-inductive-step.svg "The DFA side and the arithmetic side meet in the inductive step")

After these steps the two sides of the equivalence say the same thing, which closes the goal.
Steps 1, 2 and 4 each get their own helper lemma, so let's look at those first.

##### Splitting the Run

```lean
lemma split_run (column : Sigma3) (columns : List Sigma3) (carryIn carryOut : Bool) :
    RunEndsWithCarry carryIn (column :: columns) carryOut ↔
      ∃ carryMid,
        dfaStep (.carry carryIn) column = .carry carryMid ∧
        RunEndsWithCarry carryMid columns carryOut := by
    ...
```

This is step 1 of the plan.
The lemma says that a run over the word in the inductive step (`column :: columns`) ends in `carryOut` if and only if there is an intermediate carry `carryMid` such that the first column takes the DFA to `carryMid` and the rest of the run from `carryMid` ends in `carryOut`.

As a reminder, the definition of `RunEndsWithCarry` is:

```lean
def RunEndsWithCarry (carryIn : Bool) (wLE : List Sigma3) (carryOut : Bool) : Prop :=
  adderDFA.evalFrom (.carry carryIn) wLE = .carry carryOut
```

so unfolding `RunEndsWithCarry` leaves us with the following goal:

```lean
⟦adderDFA.evalFrom (.carry carryIn) (column :: columns) = .carry carryOut ↔⟧
  ∃ carryMid,
    dfaStep (.carry carryIn) column = .carry carryMid ∧
    ⟦adderDFA.evalFrom (.carry carryMid) columns = .carry carryOut⟧
```


We're going to prove this by rewriting both sides to be the same statement. 
We'll run through the informal argument first and then we'll have a look at how it's formalized in Lean.

First, we split the left-hand side into a single step on the first column followed by a run over `columns` from the state that the step lands in:

```lean
adderDFA.evalFrom ⟦(dfaStep (.carry carryIn) column)⟧ columns = .carry carryOut ↔
  ∃ carryMid,
    dfaStep (.carry carryIn) column = .carry carryMid ∧
    adderDFA.evalFrom (.carry carryMid) columns = .carry carryOut
```

Below is a visual representation of the split:

![The run over column :: columns split into a single step on column that lands in carry mid, followed by a run over columns from carry mid](./assets/split-run.svg "The run over the whole word is a single step on the first column followed by a run over the rest")

We now have `dfaStep (DfaState.carry carryIn) column` on both sides of the equivalence.
Next, let's assume that the first step on `column` ends in a carry state `c`.
Then we have

```lean
adderDFA.evalFrom ⟦(.carry c)⟧ columns = .carry carryOut ↔
  ∃ carryMid,
    ⟦.carry c⟧ = .carry carryMid ∧
    adderDFA.evalFrom (.carry carryMid) columns = .carry carryOut
```

The right-hand side of the equivalence is only true if `c = carryMid`, therefore we can drop the existential and the first conjunct and rewrite it as

```lean
adderDFA.evalFrom (.carry c) columns = .carry carryOut ↔
    adderDFA.evalFrom (.carry ⟦c⟧) columns = .carry carryOut
```

which matches the left-hand side exactly.

So far we have assumed that `dfaStep (DfaState.carry carryIn) column` ends up in a carry state `c`, but the step on the column can also end up in a dead state.
The right-hand side is explicitly only true if the first step ends in a carry state, but the left-hand side could potentially allow a dead state on the first step. 
Except we know that the dead state is a sink (a run starting in a dead state ends in a dead state) which makes the left-hand side false too.
Both sides are false, so the equivalence holds, which concludes the proof.

Now let's review what the proof looks like in Lean:

```lean
lemma split_run (column : Sigma3) (columns : List Sigma3) (carryIn carryOut : Bool) :
    RunEndsWithCarry carryIn (column :: columns) carryOut ↔
      ∃ carryMid,
        dfaStep (.carry carryIn) column = .carry carryMid ∧
        RunEndsWithCarry carryMid columns carryOut := by
  simp only [RunEndsWithCarry, DFA.evalFrom_cons, adderDFA_step]
  cases dfaStep (.carry carryIn) column with
  | dead => 
    rw [dead_state_is_sink]
    simp
  | carry c => 
    simp only [DfaState.carry.injEq, exists_eq_left']
```

The first `simp only` line rewrites the lemma to a form with `dfaStep` on both sides of the equivalence:

```lean
adderDFA.evalFrom ⟦(dfaStep (.carry carryIn) column)⟧ columns = .carry carryOut ↔
  ∃ carryMid,
    dfaStep (.carry carryIn) column = .carry carryMid ∧
    adderDFA.evalFrom (.carry carryMid) columns = .carry carryOut
```

`simp only` restricts `simp` to the listed lemmas instead of its whole default set which is useful and sometimes necessary to make things more explicit.

The `cases dfaStep (.carry carryIn) column` line introduces two new goals: one where the first step on the column ends up in dead state and one where it ends up in a carry state.

The dead state case is proved with a helper lemma that we're going to skip over here as it follows directly from our definition of `dfaStep`.

In the carry case `c` is introduced as the carry value from the first step on the column:

```lean
cases dfaStep (.carry carryIn) column with
| dead => ...
| carry c => 
  simp only [DfaState.carry.injEq, exists_eq_left']
```

Which leaves us with the following goal:

```lean
adderDFA.evalFrom ⟦(.carry c)⟧ columns = .carry carryOut ↔
  ∃ carryMid,
    ⟦.carry c⟧ = .carry carryMid ∧
    adderDFA.evalFrom (.carry carryMid) columns = .carry carryOut
```

Earlier we took it for granted that `.carry c = .carry carryMid` implies `c = carryMid`, but we need a formal argument for this now.
Luckily constructors like `DfaState.carry` are injective in Lean, meaning that if two values built with the same constructor are equal, then their arguments are equal.
This useful fact is provided by the automatically generated `DfaState.carry.injEq` theorem which `simp` uses to hoist `c` and `carryMid` out of the `.carry` constructor:

```lean
adderDFA.evalFrom (.carry c) columns = .carry carryOut ↔
  ∃ carryMid,
    ⟦c⟧ = ⟦carryMid⟧ ∧
    adderDFA.evalFrom (.carry carryMid) columns = .carry carryOut
```

Then we use the theorem `exists_eq_left'` from the standard library to close the goal.
The theorem states `(∃ a, a' = a ∧ p a) ↔ p a'` which lets us substitute `carryMid` with `c` and drop the existential and the first conjunct:

```lean
adderDFA.evalFrom (.carry c) columns = .carry carryOut ↔
    adderDFA.evalFrom (.carry ⟦c⟧) columns = .carry carryOut
```

This concludes the proof since both sides of the equivalence are the same now.

##### First Step Adds

```lean
lemma first_step_adds (x y z carryIn carryOut : Bool) :
    dfaStep (.carry carryIn) (x, y, z) = .carry carryOut ↔
      x + y + carryIn = z + 2 * carryOut := by
  ...
```

This is step 2 of the plan.
The lemma says that a single step of the DFA on the column `(x, y, z)` takes the state `carryIn` to the state `carryOut` if and only if

$$x + y + c_{\mathrm{in}} = z + 2 \cdot c_{\mathrm{out}}$$

which is just the [adder arithmetic](#adder-arithmetic) from earlier in a single equation.[^9]

We need this lemma to turn the first step of the run, which `split_run` separated from the rest, from a statement about the DFA into arithmetic.
We're going to prove it by unfolding the definition of `dfaStep` and then checking every combination of values for the five booleans.

As a reminder, the definition of `dfaStep` is:

```lean
def dfaStep : DfaState → Sigma3 → DfaState
  | .dead, _ => .dead
  | .carry c, (x, y, z) =>
      if z = (x ^^ y ^^ c) then  -- ^^ is XOR
        .carry (Bool.atLeastTwo x y c)
      else
        .dead
```

The state that we start from is a carry state, so the second branch applies and unfolding `dfaStep` leaves us with the following goal:

```lean
⟦(if z = (x ^^ y ^^ carryIn) then⟧
    ⟦.carry (Bool.atLeastTwo x y carryIn)⟧
 ⟦else⟧
    ⟦.dead)⟧ = .carry carryOut ↔
  x + y + carryIn = z + 2 * carryOut
```

The left-hand side of the equivalence says that the sum bit checks out and that the carry out is `true` exactly when at least two of `x`, `y` and `carryIn` are `true`.
The right-hand side says the same thing with arithmetic on natural numbers.

Both sides are fixed formulas over five booleans which yields only 32 combinations, so we can check all of them by exhaustion like we did in the base case.
The equivalence holds if both sides have the same truth value in every row of the truth table.

Let's review two of the 32 cases before we look at the Lean proof.
Take the row where `x`, `y` and `carryOut` are `true` and `z` and `carryIn` are `false`.
This is the same as our `dfaStep` example from [earlier:](#the-implementation)

![A step of the carry automaton: the column (1,1,0) takes the machine from carry 0 to carry 1](./assets/carry-dfa-carry-step.svg)

Substituting the values gives:

```lean
(if ⟦false⟧ = (⟦true⟧ ^^ ⟦true⟧ ^^ ⟦false⟧) then
    .carry (Bool.atLeastTwo ⟦true⟧ ⟦true⟧ ⟦false⟧)
 else
    .dead) = .carry ⟦true⟧ ↔
  1 + 1 + 0 = 0 + 2 * 1
```

`true ^^ true ^^ false` evaluates to `false`, so the condition holds and the step takes the first branch.
Two of `x`, `y` and `carryIn` are `true`, so the step lands in `.carry true`:

```lean
⟦.carry true⟧ = .carry true ↔
  1 + 1 + 0 = 0 + 2 * 1
```

Both sides are true, so this row holds.

Now take a row where the column doesn't add up: `x`, `y`, `z` and `carryOut` are `true` and `carryIn` is `false`.

![A step of the carry automaton: the column (1,1,1) takes the machine from carry 0 to the dead state](./assets/carry-dfa-dead-step.svg)

This time the condition is `true = (true ^^ true ^^ false)`, which is `true = false`, so the step takes the second branch and lands in the dead state:

```lean
⟦.dead⟧ = .carry true ↔
  1 + 1 + 0 = 1 + 2 * 1
```

The left-hand side is false because `.dead` and `.carry true` are different states.
The right-hand side is false because 2 is not 3.
Both sides are false, so this row holds too.

The remaining 30 rows go the same way: either the column adds up and both sides are true, or it doesn't and both sides are false.
This concludes the proof.

Now let's review what the proof looks like in Lean:

```lean
lemma first_step_adds (x y z carryIn carryOut : Bool) :
    dfaStep (.carry carryIn) (x, y, z) = .carry carryOut ↔
      x + y + carryIn = z + 2 * carryOut := by
  cases x <;> cases y <;> cases z <;> cases carryIn <;> cases carryOut <;>
    simp [dfaStep]
```

The `cases <;>` chain is the same pattern as in the base case, with five booleans instead of two.
Each `cases` doubles the number of goals, so after the chain we have 32 goals (one for each row of the truth table) with the 5 boolean variables replaced by true or false values.

Our old friend `simp` then closes each of these goals automatically by following the same procedure we did manually in the two examples.
It unfolds `dfaStep` and evaluates both sides of the equivalence until each is either true or false, and closes the goal because the two sides always agree.


##### Least Significant Bit Split

```lean
def WholeRunAddition (x y z carryIn : Bool) (a b d k : Nat) : Prop :=
  (x + 2 * a) + (y + 2 * b) + carryIn
    = (z + 2 * d) + 2 * k

def SplitRunAddition (x y z carryIn : Bool) (a b d k : Nat) : Prop :=
  ∃ carryMid : Bool,
    x + y + carryIn = z + 2 * carryMid ∧
    a + b + carryMid = d + k

lemma least_significant_bit_split (x y z carryIn : Bool) (a b d k : Nat) :
    WholeRunAddition x y z carryIn a b d k ↔
      SplitRunAddition x y z carryIn a b d k := by
  ...
```

This is step 4 of the plan.
As with the run invariant, both sides of the equivalence get their own name to make it easier to read: `WholeRunAddition` is the addition equation for the whole word, and `SplitRunAddition` is the same equation split in two.

The lemma says that the addition equation for the whole word holds if and only if there is an intermediate carry `carryMid` such that the adder equation holds for the least significant bits and the addition equation holds for the remaining bits.[^10]
The shape of this lemma mirrors `split_run`, but it's just arithmetic, the DFA doesn't appear in it.

We need this lemma to connect the two sides of the run invariant: `split_run`, `first_step_adds` and the induction hypothesis turn the DFA into an equation for the first column and an equation for the remaining columns. 
This lemma shows that together they say the same thing as the equation for the whole word.

We're going to use mathematical notation as we break down this lemma, because the arithmetic is easier to follow this way.
Unfolding `WholeRunAddition` and `SplitRunAddition` leaves us with the following goal:

$$\begin{aligned}
&(x + 2 \cdot a) + (y + 2 \cdot b) + c_{\mathrm{in}} = (z + 2 \cdot d) + 2 \cdot k \iff \\
&\qquad \exists\, c_{\mathrm{mid}} :\; x + y + c_{\mathrm{in}} = z + 2 \cdot c_{\mathrm{mid}} \;\land \\
&\qquad \phantom{\exists\, c_{\mathrm{mid}} :\;} a + b + c_{\mathrm{mid}} = d + k
\end{aligned}$$

$x$, $y$ and $z$ are the least significant bits of the three rows, $a$, $b$ and $d$ are the values of the remaining bits, and $k$ stands for the carry out term.

![The equations of the lemma laid out as a run: the equation for the whole word spans the run, the equation for the least significant bits x, y and z spans the first step, and the equation for the values of the remaining bits a, b and d spans the rest](./assets/least-significant-bit-split-variables.svg "The equations of the lemma laid out as a run, least significant bits first")

As a reminder, binary addition is defined as follows:

$$\sum_{i=0}^{n-1} x_i 2^i + \sum_{i=0}^{n-1} y_i 2^i + c_{in} = \sum_{i=0}^{n-1} z_i 2^i + c_{out} \cdot 2^n$$

The $x + 2 \cdot a$ term comes from splitting

$$\sum_{i=0}^{n-1} x_i 2^i = x_0 + 2 \cdot \sum_{i=1}^{n-1} x_i 2^{i-1}$$

so $x + 2 \cdot a$ is the value of a row whose first bit is $x$ and whose remaining bits have value $a$ (same applies to terms with $y$ and $z$).

The term $k$ stands for the term $c_{out} \cdot 2^n$ in the binary addition equation.
Notice how `WholeRunAddition` has a $2 \cdot k$ term in it while `SplitRunAddition` has just $k$ in the equation for the remaining bits.
This is because `WholeRunAddition` is one bit longer than the remaining bits in `SplitRunAddition`.

Circling back to our goal, we need to show that `WholeRunAddition` and `SplitRunAddition` are saying the same thing.
`WholeRunAddition` is a simple linear equation, but `SplitRunAddition` has an existential and a conjunction.
If we can turn `SplitRunAddition` into a linear equation, then we can close the goal by showing that the two linear equations are equivalent which is easy.

We're going to use the same trick that we used when [splitting the run:](#splitting-the-run) if the first part of the conjunction is only true for a single value of $c_{\mathrm{mid}}$, then we can substitute that value in the second conjunct and drop the existential and the first conjunct.
As a reminder, this is the first conjunct:

$$\exists\, c_{\mathrm{mid}} :\; x + y + c_{\mathrm{in}} = z + 2 \cdot c_{\mathrm{mid}}$$

The equation involves the four boolean arguments of the lemma and $c_{\mathrm{mid}}$ which means that once we fix the four booleans, $c_{\mathrm{mid}}$ is the only unknown left in it.
So we're going to check every combination of the four booleans like we did in the base case, which gives 16 cases, and solve the equation for $c_{\mathrm{mid}}$ in each of them.

If there is a solution, `SplitRunAddition` turns into a linear equation, and we'll rearrange it to show that it's the same equation as `WholeRunAddition`.
If there is no solution, `SplitRunAddition` is false, and we'll show that `WholeRunAddition` is false too.


Let's work through an example of each kind before we look at the Lean proof.

First, consider the case where $x$ and $y$ are $1$ and $z$ and $c_{\mathrm{in}}$ are $0$.
This is again the column where $1 + 1 = 0$ with $c_{out} = 1$.

![The addition in this case split into an equation for the least significant bits that lands in carry mid, followed by an equation for the remaining bits from carry mid](./assets/least-significant-bit-split-row.svg "The equation for the whole word is an equation for the least significant bits followed by an equation for the rest")

Substituting the values gives:

$$\begin{aligned}
&(⟦1⟧ + 2 \cdot a) + (⟦1⟧ + 2 \cdot b) + ⟦0⟧ = (⟦0⟧ + 2 \cdot d) + 2 \cdot k \iff \\
&\qquad \exists\, c_{\mathrm{mid}} :\; ⟦1 + 1 + 0⟧ = ⟦0⟧ + 2 \cdot c_{\mathrm{mid}} \;\land \\
&\qquad \phantom{\exists\, c_{\mathrm{mid}} :\;} a + b + c_{\mathrm{mid}} = d + k
\end{aligned}$$

On the right-hand side, the least significant bit equation is now $2 = 2 \cdot c_{\mathrm{mid}}$.
The only value that satisfies it is $c_{\mathrm{mid}} = 1$, so we can drop the existential and substitute $1$ for $c_{\mathrm{mid}}$:

$$\begin{aligned}
&(1 + 2 \cdot a) + (1 + 2 \cdot b) + 0 = (0 + 2 \cdot d) + 2 \cdot k \iff \\
&\qquad a + b + ⟦1⟧ = d + k
\end{aligned}$$

On the left-hand side, every term is now even.
Collecting the constants gives $2 + 2 \cdot a + 2 \cdot b = 2 \cdot d + 2 \cdot k$, and dividing both sides by two gives:

$$\begin{aligned}
&⟦1 + a + b = d + k⟧ \iff \\
&\qquad a + b + 1 = d + k
\end{aligned}$$

Both sides say the same thing, so the case holds.

Now take a case where the column doesn't add up: $x$ is $1$ and $y$, $z$ and $c_{\mathrm{in}}$ are $0$.

![The addition in this case split into an equation for the least significant bits 1, 0 and 0, followed by an equation for the remaining bits from carry mid](./assets/least-significant-bit-split-row-mismatch.svg "The same split in a case where the column doesn't add up")

Substituting the values gives:

$$\begin{aligned}
&(⟦1⟧ + 2 \cdot a) + (⟦0⟧ + 2 \cdot b) + ⟦0⟧ = (⟦0⟧ + 2 \cdot d) + 2 \cdot k \iff \\
&\qquad \exists\, c_{\mathrm{mid}} :\; ⟦1 + 0 + 0⟧ = ⟦0⟧ + 2 \cdot c_{\mathrm{mid}} \;\land \\
&\qquad \phantom{\exists\, c_{\mathrm{mid}} :\;} a + b + c_{\mathrm{mid}} = d + k
\end{aligned}$$

This time the least significant bit equation is $1 = 2 \cdot c_{\mathrm{mid}}$.
No value of $c_{\mathrm{mid}}$ satisfies it since the left-hand side is odd and the right-hand side is even, so the right-hand side of the equivalence is false.
The left-hand side of the equivalence is 

$$1 + 2 \cdot a + 2 \cdot b = 2 \cdot d + 2 \cdot k$$ 

which is also odd on one side and even on the other, so it's false as well.
Both sides are false, so the case holds.

The remaining 14 cases are one of these two kinds.
If the sum of $x$, $y$ and $c_{\mathrm{in}}$ has the same parity as $z$, exactly one $c_{\mathrm{mid}}$ satisfies the least significant bit equation and the rest of the equation matches once we divide by two.
If the parities differ, both sides are false.
This concludes the proof.

The second kind of case is how the dead state shows up on the arithmetic side.
On the DFA side, a column with the wrong parity sends the run into the dead state, so it never ends in a carry state.
On the arithmetic side, the same column makes both sides of the equivalence false, so we don't need a separate case for it.

Now let's review what the proof looks like in Lean:

```lean
lemma least_significant_bit_split (x y z carryIn : Bool) (a b d k : Nat) :
    WholeRunAddition x y z carryIn a b d k ↔
      SplitRunAddition x y z carryIn a b d k := by
  cases x <;> cases y <;> cases z <;> cases carryIn <;>
    simp [WholeRunAddition, SplitRunAddition] <;>
    omega
```

The `cases <;>` chain splits on the four bits, which gives 16 goals, one per case.
`simp` then runs on each of them, and `omega` runs on whatever `simp` leaves behind.

We won't go through the steps `simp` performs here, since we've seen it in action before.
`simp` leaves one goal behind in each of the 16 cases.
Each of these cases takes the shape of one of the two examples that we worked through.

If there is a solution for `carryMid`, `simp` leaves an equivalence of two linear equations.
This is the goal for the first example from above:

$$\begin{aligned}
1 + 2 \cdot a + (1 + 2 \cdot b) &= 2 \cdot d + 2 \cdot k \iff \\
1 + a + b &= d + k
\end{aligned}$$

If there is no solution for `carryMid`, `SplitRunAddition` is false, and `p ↔ False` is the same as `¬p`, so `simp` leaves the negation of `WholeRunAddition`.
This is the goal for the second example from above:

$$\neg\,(1 + 2 \cdot a + 2 \cdot b = 2 \cdot d + 2 \cdot k)$$

`simp` can't go further, because it cannot reason about equations.
This is where `omega` comes in, which is a decision procedure for linear arithmetic over natural numbers and integers.

`omega` proves a goal by contradiction: it assumes that the goal is false, and shows that no values of the variables can satisfy the equations and inequalities that follow from this.
In the first goal, the left-hand side is the right-hand side multiplied by two, so no values of `a`, `b`, `d` and `k` can make one side true and the other false.
In the second goal, the equation has an odd number on one side and an even number on the other, so no values can make it true.
`omega` closes the remaining 14 goals the same way, which concludes the proof of `least_significant_bit_split`.

##### Putting It Together

```lean
lemma run_invariant (wLE : List Sigma3) (carryIn carryOut : Bool) :
    RunEndsWithCarry carryIn wLE carryOut ↔
      WordAddsWithCarry carryIn wLE carryOut := by
  induction wLE generalizing carryIn with
  -- base case
  | nil => ...
  -- inductive step
  | cons column columnsLE induction_hypothesis => ...  
```

With the helper lemmas in place, we can return to the inductive step of the run invariant.
We're going to prove it by following the four steps of the plan: the first three turn the DFA on the left-hand side of the equivalence into arithmetic, and the fourth shows that the arithmetic on the two sides says the same thing.
We'll run through the informal argument first and then we'll have a look at how it's formalized in Lean.

In the inductive step the word is `column :: columnsLE`, so the goal is the run invariant for this word:

```lean
RunEndsWithCarry carryIn (column :: columnsLE) carryOut ↔
  WordAddsWithCarry carryIn (column :: columnsLE) carryOut
```

We also get to use the induction hypothesis, which is the run invariant for the remaining columns:

```lean
∀ carryIn,
  RunEndsWithCarry carryIn columnsLE carryOut ↔
    WordAddsWithCarry carryIn columnsLE carryOut
```

The `∀ carryIn` is there because of `generalizing carryIn`.
It means that the induction hypothesis holds for every starting carry, and not just for the `carryIn` of the goal.

Step 1 is to split the run.
The left-hand side of the goal is the left-hand side of `split_run`, so we can replace it with the right-hand side of the lemma:

```lean
(⟦∃ carryMid,⟧
  ⟦dfaStep (.carry carryIn) column = .carry carryMid ∧⟧
  ⟦RunEndsWithCarry carryMid columnsLE carryOut⟧) ↔
    WordAddsWithCarry carryIn (column :: columnsLE) carryOut
```

Step 2 is to turn the first step of the run into arithmetic.
Let `x`, `y` and `z` be the three bits of `column`.
The first part of the conjunction is then the left-hand side of `first_step_adds`, so we can replace it with the adder equation:

```lean
(∃ carryMid,
  ⟦x + y + carryIn = z + 2 * carryMid⟧ ∧
  RunEndsWithCarry carryMid columnsLE carryOut) ↔
    WordAddsWithCarry carryIn (column :: columnsLE) carryOut
```

Step 3 is to turn the run over the remaining columns into arithmetic.
The second part of the conjunction is the left-hand side of the induction hypothesis with `carryMid` as the starting carry, so we can replace it with the right-hand side:

```lean
(∃ carryMid,
  x + y + carryIn = z + 2 * carryMid ∧
  ⟦WordAddsWithCarry carryMid columnsLE carryOut⟧) ↔
    WordAddsWithCarry carryIn (column :: columnsLE) carryOut
```

This is why we needed `generalizing carryIn`: the run over the remaining columns starts from `carryMid`, which is not necessarily the same as `carryIn`.

The DFA is now gone from the goal and we only have arithmetic on both sides, so we're going to switch to mathematical notation again.
Let $w$ stand for the whole word and $w'$ for the remaining columns.
Unfolding `WordAddsWithCarry` on both sides gives:

$$\begin{aligned}
&\bigl(\exists\, c_{\mathrm{mid}} :\; x + y + c_{\mathrm{in}} = z + 2 \cdot c_{\mathrm{mid}} \;\land \\
&\phantom{\bigl(\exists\, c_{\mathrm{mid}} :\;} ⟦\mathrm{row}_1(w') + \mathrm{row}_2(w') + c_{\mathrm{mid}} = \mathrm{row}_3(w') + c_{\mathrm{out}} \cdot 2^{|w'|}⟧\bigr) \iff \\
&\qquad ⟦\mathrm{row}_1(w) + \mathrm{row}_2(w) + c_{\mathrm{in}} = \mathrm{row}_3(w) + c_{\mathrm{out}} \cdot 2^{|w|}⟧
\end{aligned}$$

The whole word is one column longer than the remaining columns.
So the value of each of its rows is the first bit plus twice the value of the remaining bits, and its carry out term is twice the carry out term of the remaining columns:

$$\begin{aligned}
\mathrm{row}_1(w) &= x + 2 \cdot \mathrm{row}_1(w') \\
\mathrm{row}_2(w) &= y + 2 \cdot \mathrm{row}_2(w') \\
\mathrm{row}_3(w) &= z + 2 \cdot \mathrm{row}_3(w') \\
c_{\mathrm{out}} \cdot 2^{|w|} &= 2 \cdot \bigl(c_{\mathrm{out}} \cdot 2^{|w'|}\bigr)
\end{aligned}$$

If we write $a$, $b$ and $d$ for the values of the rows of the remaining columns and $k$ for their carry out term $c_{\mathrm{out}} \cdot 2^{|w'|}$, the goal becomes:

$$\begin{aligned}
&\bigl(\exists\, c_{\mathrm{mid}} :\; x + y + c_{\mathrm{in}} = z + 2 \cdot c_{\mathrm{mid}} \;\land \\
&\phantom{\bigl(\exists\, c_{\mathrm{mid}} :\;} ⟦a + b + c_{\mathrm{mid}} = d + k⟧\bigr) \iff \\
&\qquad ⟦(x + 2 \cdot a) + (y + 2 \cdot b) + c_{\mathrm{in}} = (z + 2 \cdot d) + 2 \cdot k⟧
\end{aligned}$$

This brings us to step 4 of the plan.
The goal is `least_significant_bit_split` with the two sides of the equivalence swapped.
An equivalence holds in both directions, so the lemma closes the goal.
This concludes the proof of the inductive step, and with it the proof of the run invariant.

Next let's review what the proof of the inductive step looks like in Lean:

```lean
lemma run_invariant (wLE : List Sigma3) (carryIn carryOut : Bool) :
    RunEndsWithCarry carryIn wLE carryOut ↔
      WordAddsWithCarry carryIn wLE carryOut := by
  induction wLE generalizing carryIn with
  -- base case
  | nil => ...
  -- inductive step
  | cons column columnsLE induction_hypothesis =>
    obtain ⟨x, y, z⟩ := column
    rw [split_run]
    simp_rw [first_step_adds, induction_hypothesis]
    simp only [
      WordAddsWithCarry,
      row1LE_cons, row2LE_cons, row3LE_cons,
      List.length_cons, pow_succ'
    ]
    rw [Nat.mul_left_comm]
    exact
      Iff.symm
        (least_significant_bit_split 
          x y z carryIn 
          (row1LE columnsLE) 
          (row2LE columnsLE)
          (row3LE columnsLE) 
          (carryOut * 2 ^ columnsLE.length))
```

`obtain ⟨x, y, z⟩ := column` destructures the column into its three bits, like `let (x, y, z) = column` would in a regular program.

`rw [split_run]` is step 1 of the plan.
`rw` looks for the left-hand side of a lemma in the goal and replaces it with the right-hand side.

`simp_rw [first_step_adds, induction_hypothesis]` is steps 2 and 3.
`simp_rw` is like `rw`, but it can also rewrite under the `∃`, which `rw` can't do.

At this point the DFA is gone from the goal and we're working with arithmetic only.
The only thing left is to get the equations into a shape that matches `least_significant_bit_split`.

The goal is now:

```lean
(∃ carryMid,
  x + y + carryIn = z + 2 * carryMid ∧
  WordAddsWithCarry carryMid columnsLE carryOut) ↔
    WordAddsWithCarry carryIn ((x, y, z) :: columnsLE) carryOut
```

The `simp only` line first unfolds `WordAddsWithCarry` on both sides of the goal, but we'll just focus on the right-hand side of the equivalence, as the goal gets too large to follow otherwise.
So `simp only` first rewrites

```lean
WordAddsWithCarry carryIn ((x, y, z) :: columnsLE) carryOut
```

as

```lean
row1LE ((x, y, z) :: columnsLE) + row2LE ((x, y, z) :: columnsLE) + carryIn =
  row3LE ((x, y, z) :: columnsLE) + carryOut * 2 ^ ((x, y, z) :: columnsLE).length
```

Then it splits the first column off from the whole word on the right-hand side using the `rowLE_cons` lemmas:

```lean
⟦x + 2 * row1LE columnsLE⟧ + (⟦y + 2 * row2LE columnsLE⟧) + carryIn =
  ⟦z + 2 * row3LE columnsLE⟧ + carryOut * 2 ^ ((x, y, z) :: columnsLE).length
```

The `rowLE_cons` lemmas say that the value of a row of `column :: columnsLE` is the column's bit plus twice the value of the same row of `columnsLE`.

Finally, it does the same for the carry out term using `List.length_cons` and `pow_succ'`:

```lean
x + 2 * row1LE columnsLE + (y + 2 * row2LE columnsLE) + carryIn =
  z + 2 * row3LE columnsLE + carryOut * ⟦(2 * 2 ^ columnsLE.length)⟧
```

`List.length_cons` says that `column :: columnsLE` is one longer than `columnsLE`, and `pow_succ'` rewrites $2^{n+1}$ as $2 \cdot 2^n$.

At this point there is just one small thing that we need to fix before we can conclude the proof using `least_significant_bit_split`.
The lemma has a $2 \cdot k$ term, where $k$ stands for the carry out term of the remaining columns, so it expects `2 * (carryOut * 2 ^ columnsLE.length)`, but we have `carryOut * (2 * 2 ^ columnsLE.length)`.

`rw [Nat.mul_left_comm]` fixes this.
`Nat.mul_left_comm` states `a * (b * c) = b * (a * c)`, so rewriting with it swaps `carryOut` and `2` on the right-hand side of the equivalence:

```lean
x + 2 * row1LE columnsLE + (y + 2 * row2LE columnsLE) + carryIn =
  z + 2 * row3LE columnsLE + ⟦2 * (carryOut * 2 ^ columnsLE.length)⟧
```

The goal is now in the shape of `least_significant_bit_split` (with the sides of the equivalence reversed).

As the final step of the proof we switch into term mode using the `exact` tactic.
This means that in order to conclude the proof, we need to construct a term that matches the type of the goal.
The full goal including the left-hand side of the equivalence is quite a mouthful, so I'll only show it for completeness:

```lean
(∃ carryMid,
  x + y + carryIn = z + 2 * carryMid ∧
  row1LE columnsLE + row2LE columnsLE + carryMid =
    row3LE columnsLE + carryOut * 2 ^ columnsLE.length) ↔
    x + 2 * row1LE columnsLE + (y + 2 * row2LE columnsLE) + carryIn =
      z + 2 * row3LE columnsLE + 2 * (carryOut * 2 ^ columnsLE.length)
```

We construct the necessary term by calling `least_significant_bit_split` with the carry arguments from the theorem and the column arguments from the induction hypothesis, and wrapping the result in `Iff.symm` to flip the sides of the equivalence:

```lean
Iff.symm
  (least_significant_bit_split 
    x y z carryIn 
    (row1LE columnsLE) 
    (row2LE columnsLE)
    (row3LE columnsLE) 
    (carryOut * 2 ^ columnsLE.length))
```


You don't have to convince yourself that this term has the type of the goal, you can trust Lean with this.

#### $B^{\mathcal{R}}$ Is Regular

Now that we have proven the `run_invariant` theorem, we can use it to prove that $B^{\mathcal{R}}$ is regular.
We do this in two steps: first we show that the adder DFA accepts $B^{\mathcal{R}}$, and then that this makes $B^{\mathcal{R}}$ regular.

##### Adder DFA Accepts $B^{\mathcal{R}}$

The first step is the following theorem:

```lean
theorem adderDFA_accepts_B_reverse : adderDFA.accepts = B.reverse := by
  ...
```

As we've seen before, both `adderDFA.accepts` and `B.reverse` are sets.
Therefore, the equation in the theorem is equivalent to

```lean
wLE ∈ adderDFA.accepts ↔ wLE ∈ B.reverse
```

The membership rule for `adderDFA.accepts` is

```lean
{ wLE | RunEndsWithCarry (carryIn := false) wLE (carryOut := false) }
```

Therefore,

```lean
wLE ∈ adderDFA.accepts ↔
  RunEndsWithCarry (carryIn := false) wLE (carryOut := false)
```

And the membership rule for `B.reverse` is:

```lean
{ wLE | WordAddsWithCarry (carryIn := false) wLE (carryOut := false) }
```

Therefore,

```lean
wLE ∈ B.reverse ↔
  WordAddsWithCarry (carryIn := false) wLE (carryOut := false)
```

So we need to prove that

```lean
RunEndsWithCarry (carryIn := false) wLE (carryOut := false) ↔
  WordAddsWithCarry (carryIn := false) wLE (carryOut := false)
```

But this is just the `run_invariant` theorem instantiated with `false` for both carries which we've already proven:

```lean
run_invariant (carryIn := false) wLE (carryOut := false)
```

This concludes the proof of the `adderDFA_accepts_B_reverse` theorem.

The Lean proof takes roughly the same steps, but it's about a dozen lines long, so we will not go through it in detail here.
However, it's a good idea at this point to check out the [code](https://github.com/agostbiro/my-lean/blob/main/theory-of-computation/TheoryOfComputation/Chapter1_Problem32/Proof.lean) and step through it yourself, so you can see the proof unfold interactively.

##### From Acceptance to Regularity

With the `adderDFA_accepts_B_reverse` theorem in hand, we can show that $B^{\mathcal{R}}$ is regular.
The theorem is just the statement that `IsRegular` holds for `B.reverse`:

```lean
theorem B_reverse_isRegular : B.reverse.IsRegular :=
  ...
```

There is no `by` after the `:=`, so this is a term mode proof, which means that we write the term of the theorem's type directly instead of having tactics build it for us.
As we saw earlier, `IsRegular` says that there exists a finite type of states and a DFA over those states that accepts the language:

```lean
def IsRegular (L : Language T) : Prop :=
  ∃ σ [Fintype σ], ∃ M : DFA T σ, M.accepts = L
```

So we need to show that there is a finite type of states, a DFA over those states, and that the DFA accepts `B.reverse`, which we do by listing them between angle brackets:

```lean
theorem B_reverse_isRegular : B.reverse.IsRegular :=
  ⟨DfaState, inferInstance, adderDFA, adderDFA_accepts_B_reverse⟩
```

`DfaState` is the type of states, and `adderDFA` is the DFA.
`inferInstance` asks Lean to find the `Fintype` instance for `DfaState`, which was generated when we derived `Fintype` for it.
The instance is a list of all the values of the type, together with a proof that the list is complete.
The last part is the proof that the DFA accepts `B.reverse`, which is the theorem we've just proven.

#### $B$ Is Regular

We've set out to prove that the language $B$ is regular and we're finally in a position to do so.
All we need is the closure of regular languages under reversal.
Mathlib provides this as [`Language.isRegular_reverse_iff`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Computability/NFA.html#Language.isRegular_reverse_iff), and its type is

```lean
L.reverse.IsRegular ↔ L.IsRegular
```

where `L` is a generic `Mathlib.Computability.Language`.

An equivalence holds in both directions and we have a proof that `B.reverse.IsRegular`, so we can use the implication

```lean
L.reverse.IsRegular → L.IsRegular
```

to prove that $B$ is regular.

The formalization in Lean is written as follows:

```lean
theorem B_isRegular : B.IsRegular :=
  Language.isRegular_reverse_iff⟦.mp⟧ B_reverse_isRegular
```

`mp` is short for modus ponens which is the logical argument that if $a$ implies $b$ and $a$ holds, then $b$ holds as well.
We use the `mp` field here to turn the theorem which has type `L.reverse.IsRegular ↔ L.IsRegular` into a function with type `L.reverse.IsRegular → L.IsRegular`.

We pass this function `B_reverse_isRegular`, and we get back a term with type `B.IsRegular` which is the proof that `B` is regular.

[^1]: Instead of using the `LE/BE` convention to distinguish between interpretations of lists of bits, we could introduce separate types for little- and big-endian lists of bits to prevent mixing them up. However this would require re-deriving many of the theorems that are already available for native lists, so it's not worth it for a project of this scope.

[^2]: Set as a collection is available as `Std.HashSet` and `Std.TreeSet`.

[^3]: A decision procedure is a function that evaluates a proposition and returns `true` if it holds and `false` if it doesn't. We have this automatically for the `dfaStep` example, because the proposition is an equation between two `DfaState` values and we've derived `DecidableEq` for `DfaState` earlier.

[^4]: The reduction in the type checker is guaranteed to terminate, because Lean rejects functions unless it can prove that they terminate. A definition can opt out explicitly, but then the type checker cannot unfold it, so it cannot be evaluated in a proof.

[^5]: The actual term is `of_decide_eq_true (id (Eq.refl true))`. The `id` is a type ascription that `decide` needs because it builds the argument before it applies `of_decide_eq_true`, so it has to record that `Eq.refl true` is meant as a proof of `decide p = true` rather than `true = true`. When the proof is written by hand, the expected type is known from the `example` signature, so the `id` can be omitted.

[^6]: Simplified version of Mathlib's definition. The actual definition spells out the universe of `T` and writes the finiteness as `∃ σ : Type, ∃ _ : Fintype σ`.

[^7]: The actual Mathlib definition is a bit more verbose, so I'm not quoting it here.

[^8]: The informal argument about the equivalence of the little-endian interpretation of a word and the big-endian interpretation of its reversal (`rowNLE w = rowNBE w.reverse`) is formalized in the proof, but it's basically just bookkeeping, so I didn't include it in the post.

[^9]: As before, we've dropped `.toNat` from the booleans in the lemma statement for brevity.

[^10]: Dropped `.toNat` for brevity.
