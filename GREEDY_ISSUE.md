# Greedy Schedule Issue

The greedy algorithm consistently schedules 247/256 games (9 short). This is because:

1. **It's an NP-complete problem**: Scheduling 256 games across 17 weeks with the constraint that each team plays max 1 game/week is equivalent to graph edge coloring.

2. **Greedy algorithms fail**: They make locally optimal choices that lead to globally suboptimal solutions. Later weeks run out of valid matchups.

3. **Need proper CSP solver**: Options:
   - Backtracking with constraint propagation
   - Simulated annealing
   - Integer Linear Programming (but GLPK.js MIP is broken)
   - External SAT solver

**Current best: 247/256 games (96.5% complete)**

The user requires 256/256 games (100%). Implementing backtracking CSP solver now...

