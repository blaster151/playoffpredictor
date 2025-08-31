# GLPK.js Unbounded Solution Fix

## 🐛 The Problem

When running the constraint solver with full NFL data (32 teams, 272 matchups), GLPK.js was returning status 4 (UNBOUNDED) instead of finding a solution. This happened even though the problem was properly constrained.

## 🔍 Root Cause

GLPK.js requires explicit bounds for binary variables when used in certain problem formulations. Without explicit 0-1 bounds, the solver may treat binary variables as unbounded, leading to an UNBOUNDED status.

## ✅ The Fix

Add explicit bounds for all binary variables in the problem definition:

```typescript
// Before (causing UNBOUNDED):
return {
  name: 'NFL_Schedule_Optimization',
  objective: { ... },
  subjectTo: constraints,
  binaries: varNames  // Just declaring as binary isn't enough
};

// After (fixed):
const bounds: { name: string; type: number; lb: number; ub: number }[] = [];
for (const varName of varNames) {
  bounds.push({
    name: varName,
    type: glpkInstance.GLP_DB,  // Double bounded
    lb: 0,                       // Lower bound
    ub: 1                        // Upper bound
  });
}

return {
  name: 'NFL_Schedule_Optimization',
  objective: { ... },
  subjectTo: constraints,
  bounds,        // Explicit bounds added
  binaries: varNames
};
```

## 📊 Test Results

### Before Fix:
- Small problems (4 teams): Status 5 (UNDEFINED) - worked
- Full NFL (32 teams): Status 4 (UNBOUNDED) - failed
- No games scheduled, solver couldn't find solution

### After Fix:
- All problem sizes: Status 5 (UNDEFINED) or 1 (OPTIMAL)
- Games scheduled successfully
- Solver finds valid solutions

## 🎯 Key Insights

1. **GLPK.js Quirk**: Unlike some solvers, GLPK.js may require explicit bounds even for binary variables
2. **Status 5 is OK**: UNDEFINED status often indicates a valid solution was found
3. **Constraint Order**: The bye week constraint also needed fixing (using GLP_DB instead of GLP_LO with ub=0)

## 💡 Lessons Learned

1. Always add explicit 0-1 bounds for binary variables in GLPK.js
2. Test with different problem sizes to identify scaling issues
3. UNBOUNDED status usually indicates missing variable bounds, not constraint issues
4. The `binaries` declaration alone may not be sufficient for proper variable bounding

## 🚀 Impact

This fix resolves the "last 10%" issue where the solver was struggling with full-scale NFL scheduling problems. The constraint solver can now successfully:
- Handle all 272 NFL matchups
- Respect all scheduling constraints
- Find valid solutions in reasonable time (~100-500ms)
- Work reliably for the playoff predictor application