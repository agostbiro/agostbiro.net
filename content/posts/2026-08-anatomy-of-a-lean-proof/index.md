---
title: "Anatomy of a Lean Proof for Software Engineers"
date: "2026-08-10"
draft: true
---

I recently worked through a problem from a theory of computation textbook that asked me to prove a property of a language using finite automata.
The informal proof is a simple constructive proof where you build an automaton and show that it recognizes the language.
This is kind of similar to program verification, so I thought it'd be interesting to see what it takes to formalize the proof.
Lean is a good choice for this, because its [Mathlib](https://lean-lang.org/use-cases/mathlib/) has all the theorems needed for the problem.

After finishing the formal proof, I decided to write it up, because I think it provides good insight into what it takes to formally prove properties of a system.
The construction that we're going prove is itself a program, so we don't just end up with a mathematical proof, but also a verified implementation.

I tried to make the subject accessible.
If you're comfortable with a modern statically typed programming language (such as TypeScript or Rust), binary arithmetic, and inductive proofs, you should have no difficulties following along.

## Background: DFAs & Regular Languages

*Feel free to skip this section if you're comfortable with DFAs and regular languages.*

Finite automata provide a model of computation with fixed memory.
Finite automata are not only important for theory, they also have important practical applications. 
For example, finite automata are relevant for regular expressions, where a [bug](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/) once took a significant portion of the internet down.

### Deterministic Finite Automaton (DFA)

A **deterministic finite automaton** (DFA) is a machine with a fixed, finite set of states that reads its input one symbol at a time, left to right, updating its state with each symbol using a deterministic transition function.
After the last symbol, the machine either sits in an *accepting* state (input is accepted) or not (input is rejected).

If you've ever written a simple regular expression like `-?[0-9]+`, then you've constructed a DFA. 
This regex matches integer literals like `12` and `-123` and the corresponding DFA looks like this (the arrows are annotated with the symbols that lead to the next state):

![DFA figure for integer literal regex DFA](./assets/int-lit-regex-dfa.svg)

This DFA has four states:
- **Start:** this is where we start before processing the first character. Since the start state is not an accepting state, we reject the empty string.
- **Sign:** we move to the sign state when we encounter the `-` character in the start state. We can skip the sign state and jump directly to digits from start, since the sign character is optional (`-?`). If we're in this state at the end of the string, then we reject the string.
- **Digits:** we move from start or sign to digits when we encounter a digit character (`[0-9]`). If we're in the digits state and encounter a digit character again, then we stay in the digit state. The digit state is the only accepting state of the DFA. If we're in this state after we've processed the input string, then the DFA accepts the string.
- **Dead:** we get into this state if we encounter any other character than a digit (unless it's a negative sign at the start). If we're in the dead state at the end of the string, then the DFA rejects the string. Once we're in the dead state, we stay in it, so the dead state in this DFA is a *sink*.

The set of input symbols to the machine is defined by the set $\Sigma$. 
In our regex example, $\Sigma = \left\{-, 0, 1, 2, \ldots, 9\right\}$.

### Regular Languages

A **language** is just a set of strings, and a language is called **regular** if some DFA accepts the strings in it. 
Recognizing regular languages is the class of decision problems solvable with a constant amount of memory in the input size.

Regular languages have useful closure properties: the union, intersection, complement, and (important for us) **reversal** of a regular language is regular.

The standard way to prove that a language is regular is to build a DFA and show that it accepts exactly that language.

We can describe a language $A$ with set-builder notation: 
$$A = \bigl\{\, w \in \Sigma^{*} \bigm| P(w) \,\bigr\}$$


$\Sigma^{*}$ means the set of strings that are created by all possible concatanations of symbols in $\Sigma$ and $P(w)$ is the logical proposition (a statement that is either true or false) that the string $w$ is well-formed.

Let's apply this notation to our regex example: `-?[0-9]+`. Then $\Sigma^{*}$ contains string like `""`, `"123"`, `"-111"`, `"2-625-"`, etc. and $P(w)$ can be defined as "$w$ is not empty and only its first character can be a negative sign". 


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
> where $P(w)$ is the proposition that the the bottom row of $w$ equals the sum of the top two rows.
>
> Show that $B$ is regular. (Hint: it is easier to work with $B^{\mathcal{R}}$.)

The problem defines an unusual alphabet.
Instead of regular characters like `[a-z]`, the alphabet is made up of columns of three bits.
So instead of a language that consists of strings like `"apple"`, `"banana"`, etc, the language consists of two dimensional bit strings like

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
The challenge in this problem is that we need to do this with a fixed amount of memory for arbitrarty long strings.

## The Solution

The trick is to remember how you add numbers by hand: you work from the least significant digit to the most significant, and the only thing you carry from one column to the next is the carry.

But a DFA reads left to right, and the problem presents the numbers most significant bit first.
So we don't recognize $B$ directly. 
Instead we build a DFA to recognize its reversal $B^R$ which is the same strings that are in $B$ written backwards, so the machine sees the least significant column first.

If we can build a DFA to recognize $B^R$, then we can conclude that $B^R$ is a regular language.
Since $B^R$ reversed is $B$, we can use of the closure property of the reversal of natural languages to conlcude that $B$ is regular as well which concludes the solution.

### Adder Arithmetic

When doing the arithmetic column-by-column, we compute the sum bit at each step as follows: 

$$x_i \oplus y_i \oplus c_{in} = z_i$$ 

where $x, y$ are the addend bits, $z$ is the sum bit, $i$ denotes the ordinal of the current column, and $c_{in}$ is the input carry from the previous step.
We compute the output carry denoted $c_{out}$ for the next step as follows:

$$c_{out} = (x_i \wedge y_i) \vee \left( c_{in} \wedge (x_i \oplus y_i) \right)$$
This means that that there is a carry either if both terms are $\mathtt{1}$ or there was an input carry and least one of the terms is $\mathtt{1}$. Note that a simpler way to compute $c_{out}$ is to check if at least two of $x_i$, $y_i$ and $c_{in}$ are $\mathtt{1}$ (we'll make use of this in the Lean proof).

### Adder DFA

With this in mind, here is the DFA that recognizes $B^R$:

![DFA figure for the 1-bit full adder recognizing B reversed](./assets/carry-dfa.svg)

The adder DFA has three states:

- **Carry 0:** We're in this state if the carry is 0 before processing the next column. This is both the starting and the accepting state, since a leftover carry at the end would mean the sum overflowed the bottom row. 
- **Carry 1:** We're in this state if the carry is 1 before processing the next column. This state is non-accepting, since a word ending here has a carry left over, so the sum overflowed. But unlike the dead state we can still leave it, since a $\left[\begin{smallmatrix}\mathtt{0}\\\mathtt{0}\\\mathtt{1}\end{smallmatrix}\right]$ column absorbs the pending carry and takes us back to carry 0. 
- **Dead:** We end up in this state if the sum doesn't match. This is a sink state meaning it's terminal.


The arrows are annotated with the columns that lead from the input state to the output state.
This is important, because the DFA doesn't check the adder equation explicitly.
It just knows that given a state and a symbol what the next state is.
It will be our job to show that repeated invocations of the DFA step are equivalent to checking that the sum is correct.

### Example 1

Let's trace the first example through the DFA:

```
011 # x row: 3 in decimal
001 # y row: 1 in decimal
100 # z row: 4 in decimal
```

Unrolling the run turns it into a straight line with one copy of the state per step.
The DFA recognizes $B^R$, so it reads the columns backwards.

![The run of the carry automaton on the accepted word, unrolled into a chain of states](./assets/carry-dfa-run-accept.svg)

The run ends in carry 0 (the accepting state), so the reversed word is in $B^R$. 
Due to the closure property of reversal, the original word is in $B$ as well.

Note that the machine passes *through* the non-accepting carry 1 state twice.
Had the word stopped after either of the first two column, it would have been rejected, since $\mathtt{1} + \mathtt{1} = \mathtt{0}$ and $\mathtt{11} + \mathtt{01} = \mathtt{00}$ are both wrong without somewhere to put the carry.

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

Our goal is to show that the language $B$ from [Problem 1.32](#the-problem) is [regular.](#regular-languages)
As discussed earlier, in order to show that a language is regular, we need to build a [DFA](#deterministic-finite-automaton-dfa) and show that it accepts the language.

The Lean proof will consist of three parts:

1. A **specification** of the language $B$.
2. An executable **implementation** of the [adder DFA](#the-adder-DFA).
3. A **proof** connecting the specification and the implementation.

In addition to being a proof assistant, Lean is also a functional programming language, so the specification and the implementation will look like a regular program in a statically typed functional language.
Lean's [Mathlib](https://lean-lang.org/use-cases/mathlib/) has first class support for formal languages and DFAs, so we will just need to instantiate structures from the library to specify the language $B$ and implement the adder DFA.

For the proof, we'll have to do more work, but Mathlib will be helpful here as well, as it contains the theorem that regular languages are closed under reversal, which will save a lot of work.
The proof will contain a lot of unfamiliar syntax, but under the hood it's just a program.
In fact, the proof is accepted if the program compiles.

Below is a figure laying out the components of the program:

![Diagram of the three layers of the Lean file and the dependencies between their definitions and theorems](./assets/proof-structure.svg "The specification and the implementation meet in the proof layer")

### Layer 1: the specification

The alphabet is a triple of booleans, and a binary interpretation of a bit list is a two-line recursive function:

```lean
/-- A symbol in the alphabet `Σ₃`: a column of three bits. -/
abbrev Sigma3 := Bool × Bool × Bool

/-- Little endian interpretation of a list of bools. -/
def valueLE : List Bool → Nat
  | [] => 0
  | b :: bs => b.toNat + 2 * valueLE bs

/-- Big endian interpretation: reading a list most significant bit first
is reading its reverse least significant bit first. -/
def valueBE (bs : List Bool) : Nat := valueLE bs.reverse
```

That one-liner `valueBE` is the load-bearing definition of the whole file. It states, exactly once, the insight the solution rests on: the problem is big-endian (fixed by the problem statement), the automaton is little-endian (fixed by the direction carries flow), and `reverse` is what connects them.

The language itself is a set-builder over words, straight out of the book:

```lean
def row1 (w : List Sigma3) : List Bool := w.map fun (x, _, _) => x
def row2 (w : List Sigma3) : List Bool := w.map fun (_, y, _) => y
def row3 (w : List Sigma3) : List Bool := w.map fun (_, _, z) => z

/-- The language `B`: words whose bottom row is the sum of the top two rows. -/
def B : Language Sigma3 :=
  { wBE | valueBE (row3 wBE) = valueBE (row1 wBE) + valueBE (row2 wBE) }
```

Note what's *not* here: nothing about automata, states, or carries. The specification only says what B means. If you got this part wrong, no amount of proof below would save you — this is the part a human still has to review. It's short enough that you can.

### Layer 2: the automaton is just a program

TODO dfaStep is cheating a bit. Theoretically, we should have a state machine and no computation

Here is the entire machine. This is the part I want to dwell on, because it looks exactly like code you'd write in any functional language — because it is:

```lean
inductive DfaState where
  /-- The columns read so far produced carry `c`. -/
  | carry (c : Bool)
  /-- A column has already contradicted the addition; the word is rejected. -/
  | dead
  deriving DecidableEq, Fintype

/-- The transition function: a one-bit full adder with a sink. -/
def dfaStep : DfaState → Sigma3 → DfaState
  | .dead, _ => .dead
  | .carry c, (x, y, z) =>
      if z = (x ^^ y ^^ c) then       -- sum bit checks out?
        .carry (Bool.atLeastTwo x y c) -- carry-out = majority(x, y, c)
      else
        .dead

def carryDFA : DFA Sigma3 DfaState where
  step := dfaStep
  start := .carry false
  accept := {.carry false}
```

An enum with three values, a pattern match, an `if`. `z = x ^^ y ^^ c` is the sum output of a full adder; `Bool.atLeastTwo x y c` (majority) is its carry output. If you've ever drawn a full adder out of XOR and majority gates, this is that circuit, transcribed.

And because Lean is a programming language, **this runs**. `#eval carryDFA.eval [(true, false, true)]` computes an actual answer. The file exploits this to check every edge of the state diagram against the code, using `decide` — a tactic that literally *executes* the proposition and checks it comes out `true`:

```lean
-- `carry 0 --110--> carry 1`: `1 + 1` is `0` carry `1`.
example : dfaStep (.carry false) (true, true, false) = .carry true := by decide
-- `carry 1 --001--> carry 0`: `0 + 0 + 1` is `1` carry `0`.
example : dfaStep (.carry true) (false, false, true) = .carry false := by decide
-- Spot checks for the dead state.
example : dfaStep (.carry false) (false, false, true) = .dead := by decide
```

These are unit tests, except they live in the same file as the implementation, are checked at compile time, and can never silently rot. That's the low end of a spectrum: `decide`-style checks verify *specific inputs*, the theorems in the next section verify *all* inputs, and both talk about the same executable definition. There is no gap between "the model we verified" and "the code we run."

The `DFA` structure itself comes from Mathlib (`Mathlib.Computability.NFA`), along with its evaluation function `evalFrom`, which is nothing more than a left fold of `step` over the input — again, exactly the code you'd write yourself.

### Layer 3: the proof

**Step 1: one transition = one adder equation.** The first lemma characterizes a single step arithmetically:

```lean
lemma dfaStep_carry_iff (x y z carryIn carryOut : Bool) :
    dfaStep (.carry carryIn) (x, y, z) = .carry carryOut ↔
      x.toNat + y.toNat + carryIn.toNat = z.toNat + 2 * carryOut.toNat := by
  cases x <;> cases y <;> cases z <;> cases carryIn <;> cases carryOut <;>
    simp [dfaStep]
```

Read the statement: "the step function moves from carry `carryIn` to carry `carryOut` on column `(x,y,z)` **iff** `x + y + carryIn = z + 2·carryOut` as natural numbers." This is the bridge between the boolean world of the program (`^^`, `atLeastTwo`) and the arithmetic world of the specification (`+`, `*`). The proof is brute force: `cases` splits on all five booleans — 32 cases — and `simp` evaluates each one. Machine-checked truth tables are free; you'd never write this proof by hand, and you never have to.

**Step 2: the dead state is a sink.** A one-lemma induction showing no suffix rescues a word once a column has contradicted the addition:

```lean
lemma evalFrom_dead (w : List Sigma3) : carryDFA.evalFrom .dead w = .dead
```

**Step 3: the arithmetic core.** The inductive step of the invariant needs a fact that has nothing to do with automata: an addition equation splits into its low bit and its high bits, linked by a carry.

```lean
lemma low_bit_split (x y z carryIn : Bool) (a b d k : Nat) :
    (x.toNat + 2 * a) + (y.toNat + 2 * b) + carryIn.toNat
        = (z.toNat + 2 * d) + 2 * k ↔
      ∃ carryMid : Bool,
        x.toNat + y.toNat + carryIn.toNat = z.toNat + 2 * carryMid.toNat ∧
        a + b + carryMid.toNat = d + k := by
  cases x <;> cases y <;> cases z <;> cases carryIn <;> simp <;> omega
```

The `∃ carryMid` is doing quiet double duty: when the low bit has the wrong parity, *no* intermediate carry satisfies the right-hand side — which matches the run entering `dead` on the automaton side. The dead-column case of the induction falls out for free. The proof is `cases` on the booleans followed by `omega`, Mathlib's decision procedure for linear integer arithmetic — the workhorse tactic that dispatches "obvious" arithmetic goals so you don't spend an afternoon shuffling `add_comm`.

**Step 4: the run invariant.** Now the centerpiece, the induction from the whiteboard sketch, stated exactly as we stated it on paper:

```lean
lemma evalFrom_carry_iff (wLE : List Sigma3) (carryIn carryOut : Bool) :
    carryDFA.evalFrom (.carry carryIn) wLE = .carry carryOut ↔
      valueLE (row1 wLE) + valueLE (row2 wLE) + carryIn.toNat
        = valueLE (row3 wLE) + carryOut.toNat * 2 ^ wLE.length := by
  induction wLE generalizing carryIn with
  | nil =>
    cases carryIn <;> cases carryOut <;>
      simp [valueLE, row1, row2, row3, DFA.evalFrom]
  | cons column columnsLE induction_hypothesis =>
    obtain ⟨x, y, z⟩ := column
    rw [evalFrom_cons_carry_iff]
    simp_rw [dfaStep_carry_iff, induction_hypothesis]
    ...
```

Two details are worth calling out.

First, `generalizing carryIn`. The induction hypothesis must apply to the *tail* of the run, which starts from whatever intermediate carry the first column produced — not from the original `carryIn`. Generalizing makes the hypothesis quantify over all carry-in values. Forgetting this is the classic way inductions get stuck, in Lean and on paper alike: your inductive hypothesis is too weak because you fixed something that changes as the computation proceeds.

Second, look at the shape of the inductive step. A helper lemma (`evalFrom_cons_carry_iff`) rewrites "the run over `column :: columnsLE` ends in `carry carryOut`" into "there is an intermediate carry: the first step produces it, and the rest of the run finishes from it." Then `dfaStep_carry_iff` turns the first step into an adder equation, the induction hypothesis turns the rest of the run into an addition equation, and `low_bit_split` glues the two equations back into one. The structure of the proof *is* the structure of the computation — each lemma peels off exactly one layer.

**Step 5: the main theorem.** With the invariant in hand, the language equality is bookkeeping:

```lean
theorem carryDFA_accepts : carryDFA.accepts = B.reverse := by
  ext wLE
  have invariant := evalFrom_carry_iff wLE false false
  ...
```

`ext wLE` reduces "these two languages are equal" to "an arbitrary word is in one iff it's in the other." Instantiating the invariant at `false, false` kills the carry terms. What remains is translating between the two endianness conventions: membership in `B.reverse` unfolds to a statement about `wLE.reverse`, `reverse` gets pushed down onto the rows, `valueBE` unfolds to `valueLE ∘ reverse`, and the two reversals cancel via `List.reverse_reverse`. A final `eq_comm` flips the equation around (the problem writes `row3 = row1 + row2`, the invariant writes `row1 + row2 = row3`) and the goal closes.

**Step 6: regularity.** The payoff theorems are now one line each:

```lean
theorem B_reverse_isRegular : B.reverse.IsRegular :=
  ⟨DfaState, inferInstance, carryDFA, carryDFA_accepts⟩

theorem B_isRegular : B.IsRegular :=
  Language.isRegular_reverse_iff.mp B_reverse_isRegular
```

The first is the definition of regularity made concrete: a regular language is one for which there *exists* a state type, a proof it's finite, a DFA over it, and a proof the DFA accepts the language. We hand over all four: `DfaState`, its `Fintype` instance (found automatically by `inferInstance`, thanks to the `deriving Fintype` clause back on the enum), the machine, and the theorem. The second applies Mathlib's closure-under-reversal theorem, `Language.isRegular_reverse_iff` — the one piece of textbook theory we didn't have to prove ourselves, because someone already contributed it.

And to close the loop with the problem statement, the book's own examples become compile-time checks:

```lean
/-- `011 + 001 = 100`, so this word is in `B`. -/
example : [(false, false, true), (true, false, false), (true, true, false)] ∈ B := by
  rw [mem_B_iff]; decide
```

## What the anatomy tells us

Stepping back, the file has a shape worth internalizing, because it's the shape of most program verification:

| Layer | Size | Trust story |
|---|---|---|
| Specification (`B`, `valueBE`) | ~10 lines | Must be reviewed by a human against the informal problem |
| Implementation (`dfaStep`, `carryDFA`) | ~15 lines | Ordinary executable code; unit-testable with `decide` / `#eval` |
| Proof (invariant + theorems) | ~100 lines | Checked by Lean's kernel; a human only needs the *statements* |

A few takeaways for the working engineer:

- **The program and the proof share one definition.** `dfaStep` is simultaneously the thing you execute and the thing the theorems are about. Verification here isn't modeling your code in a separate tool and hoping the model matches — the code is the model.
- **Proofs decompose like programs do.** One lemma per concept: a step lemma, a sink lemma, an arithmetic lemma, an induction that composes them. The proof of the inductive step reads like a call stack.
- **The hard part is finding the invariant, not fighting the prover.** Once `evalFrom_carry_iff` is stated correctly — with the carry-out weighted by `2^|w|`, and generalized over the carry-in — the tactics (`cases`, `simp`, `omega`, `decide`) do the drudgery. The 32-case truth table and the linear arithmetic cost zero human effort.
- **Endianness is a proof-level concern, exactly once.** The mismatch between "the problem reads big-endian" and "the adder runs little-endian" is confined to one definition (`valueBE`) and one closure theorem (reversal). Everything else lives happily in a single convention. Good factoring is good factoring, in proofs as in code.

The exercise asks you to *show that B is regular*. The Lean file does something stronger: it hands you a two-state adder you can run, and a machine-checked certificate that this adder is *exactly* the language of correct binary additions — no more, no less, for every input, forever.

## Working on this with LLMs

How do you find the right tactic to use? You try some and then iterate on the error messages. Similar to how you'd resolve compiler errors in a statically typed language. Or have an LLM do it for you.

You still need to understand the proofs for two reasons:

1. Code organization and maintainability.
2. Weird proofs can indicate that you got something in your definitions wrong or in very rare cases a bug in the Lean kernel

<!-- TODO: fill in notes on the experience of using LLMs on this problem. Some prompts to cover:
  - What was delegated to the model vs. done by hand (finding the invariant? stating lemmas? tactic golf?)
  - Where the model shone (boilerplate, simp/omega incantations, recalling Mathlib names like `Language.isRegular_reverse_iff`?)
  - Where it struggled or hallucinated (nonexistent lemmas, wrong endianness, weak induction hypotheses?)
  - How the Lean feedback loop (compiler errors, goal states) changed the dynamic vs. ordinary code generation
  - Verdict: did machine-checked proofs make LLM output more trustworthy to accept?
-->

*The full source is in [`Chapter1_Problem32.lean`](https://github.com/agostbiro/my-lean/blob/main/theory-of-computation/TheoryOfComputation/Chapter1_Problem32.lean).*

## Informal Proof

Before looking at the formalization in Lean, let's complete the problem with a partial, informal proof.
We're going to prove that the carry step is arithmetically correct. 
We'll then argue that the DFA performs the same process. 
In the Lean proof we will formalize this argument and fill in the gaps.

Working towards the proof, recall that at each step, the DFA checks 

$$ x_i \oplus y_i \oplus c_i = z_i$$

where $x, y, z$ are the rows of the input respectively from the top, $i$ denotes the ordinal of the current column, and $c_{in}$ is the input carry. 

If the equation for $z_i$ holds, the DFA moves to the state determined by the output carry denoted by $c_{out}$ which is defined as follows:

$$c_{out} = (x_i \wedge y_i) \vee \left( c_{in} \wedge (x_i \oplus y_i) \right)$$

This means that that there is a carry either if both terms are $\mathtt{1}$ or there was an input carry and least one of the terms is $\mathtt{1}$. Note that a simpler way to compute $c_{out}$ is to check if at least two of $x_i$, $y_i$ and $c_{in}$ are $\mathtt{1}$ (we'll make use of this in the Lean proof).

Next, recall that we need to check the equation

$$ x + y = z $$

to determine whether whether an input string is in the language $B$. Let's expand this to include information about the length of the string (denoted as $n$), and the steps ($i$ as before, zero indexed): 

$$\sum_{i=0}^{n-1} x_i 2^i + \sum_{i=0}^{n-1} y_i 2^i = \sum_{i=0}^{n-1} z_i 2^i$$

This lets us verify that the first $n$ bits of the sum of the two top rows matches the bottom row.
But we also need to check that the the sum didn't overflow, so we need to add the final carry to the equation ($c_{out}$ is the carry after $n-1$ steps):

$$\sum_{i=0}^{n-1} x_i 2^i + \sum_{i=0}^{n-1} y_i 2^i = \sum_{i=0}^{n-1} z_i 2^i + c_{out} \cdot 2^n$$

As we've seen, the value of $c_{out}$ not only depends on $x_i$ and $y_i$, but also on $c_{in}$, so we need to add this term to create a link between the DFA and the mathematical formulation ($c_{in}$ is the carry before the first step):


$$\sum_{i=0}^{n-1} x_i 2^i + \sum_{i=0}^{n-1} y_i 2^i + c_{in} = \sum_{i=0}^{n-1} z_i 2^i + c_{out} \cdot 2^n$$

This may seem superfluous, since $c_{in}$ will be always zero at the start of the DFA, but formulated this way, we can talk about intermediate steps where $c_{in}$ may be non-zero.

Everything hinges on one **run invariant**, proved by induction on the word:
> **Invariant.** Running the machine over a (little-endian) word $w$ starting with carry $c_{\mathrm{in}}$ ends in state $c_{\mathrm{out}}$ if and only if
>
> $$\mathrm{row}_1(w) + \mathrm{row}_2(w) + c_{\mathrm{in}} = \mathrm{row}_3(w) + c_{\mathrm{out}} \cdot 2^{|w|}$$
>
> where the rows are read as little-endian binary numbers.

This is just the grade-school addition invariant: after processing the low $|w|$ columns, the columns seen so far add up correctly, and the pending carry is worth $2^{|w|}$ — it's waiting to be added at the next position.

- **Base case** (empty word): the machine doesn't move, and the equation degenerates to $c_{\mathrm{in}} = c_{\mathrm{out}}$ (both sides are just the carries, since all rows are 0 and $2^0 = 1$).
- **Inductive step**: peel off the first (lowest) column. The single-column transition is correct precisely when $x + y + c_{\mathrm{in}} = z + 2 c_{\mathrm{mid}}$ — the defining equation of a full adder — and the rest of the run is handled by the induction hypothesis with $c_{\mathrm{mid}}$ as the new carry-in. Algebraically, this corresponds to splitting an addition equation into its low bit plus the remaining high bits.

Instantiate the invariant with $c_{\mathrm{in}} = c_{\mathrm{out}} = \mathtt{false}$ (no carry into the lowest column; no carry out of the highest, or the sum overflowed) and the carry terms vanish:

$$\mathrm{row}_1(w) + \mathrm{row}_2(w) = \mathrm{row}_3(w)$$

— which is exactly membership in $B^R$.

Finally: the machine has finitely many states, so $B^R$ is regular, so $B$ is regular by closure under reversal. $\blacksquare$
