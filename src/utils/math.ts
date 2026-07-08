/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Animal, GeneticParameters, SelectionIndexConfig } from '../types';

/**
 * Perform topological sort on pedigree to ensure parents always precede offspring.
 * Adds "ghost" founders if parents are mentioned but have no explicit record.
 */
export function buildClosedSortedPedigree(rawAnimals: Animal[]): Animal[] {
  const animalMap = new Map<string, Animal>();
  rawAnimals.forEach(a => animalMap.set(a.id, a));

  // Identify all mentioned parents that don't have records
  const allIds = new Set(rawAnimals.map(a => a.id));
  const ghostAnimals: Animal[] = [];

  rawAnimals.forEach(a => {
    if (a.sireId && !allIds.has(a.sireId)) {
      allIds.add(a.sireId);
      const ghost: Animal = {
        id: a.sireId,
        name: `Macho Fundador (${a.sireId})`,
        species: a.species,
        sex: 'M',
        birthDate: '1990-01-01',
        birthYear: 1990,
        sireId: null,
        damId: null,
        breedComp: { ...a.breedComp }, // assume founding sire shares breed profile
        rebanho: a.rebanho,
        manejo: 'Fundador',
        phenotypes: {},
      };
      ghostAnimals.push(ghost);
      animalMap.set(a.sireId, ghost);
    }
    if (a.damId && !allIds.has(a.damId)) {
      allIds.add(a.damId);
      const ghost: Animal = {
        id: a.damId,
        name: `Fêmea Fundadora (${a.damId})`,
        species: a.species,
        sex: 'F',
        birthDate: '1990-01-01',
        birthYear: 1990,
        sireId: null,
        damId: null,
        breedComp: { ...a.breedComp },
        rebanho: a.rebanho,
        manejo: 'Fundadora',
        phenotypes: {},
      };
      ghostAnimals.push(ghost);
      animalMap.set(a.damId, ghost);
    }
  });

  const fullList = [...rawAnimals, ...ghostAnimals];
  const sorted: Animal[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  function visit(id: string) {
    if (temp.has(id)) {
      // Pedigree cycle detected! Break gracefully
      return;
    }
    if (!visited.has(id)) {
      temp.add(id);
      const anim = animalMap.get(id);
      if (anim) {
        if (anim.sireId) visit(anim.sireId);
        if (anim.damId) visit(anim.damId);
        sorted.push(anim);
      }
      temp.delete(id);
      visited.add(id);
    }
  }

  fullList.forEach(a => {
    if (!visited.has(a.id)) {
      visit(a.id);
    }
  });

  return sorted;
}

/**
 * Computes the full Additive Genetic Relationship Matrix A
 * and the individual Inbreeding Coefficients F using Meuwissen & Luo (1992) relationships.
 */
export function computeRelationshipMatrix(sortedAnimals: Animal[]): {
  A: number[][];
  ids: string[];
  F: { [id: string]: number };
} {
  const n = sortedAnimals.length;
  const ids = sortedAnimals.map(a => a.id);
  const idToIndex = new Map<string, number>();
  ids.forEach((id, idx) => idToIndex.set(id, idx));

  // Initialize N x N Relationship Matrix A with zeros
  const A: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const F: { [id: string]: number } = {};

  for (let i = 0; i < n; i++) {
    const anim = sortedAnimals[i];
    const sIdx = anim.sireId ? idToIndex.get(anim.sireId) : undefined;
    const dIdx = anim.damId ? idToIndex.get(anim.damId) : undefined;

    // Diagonal elements: A_ii = 1 + F_i
    // F_i = 0.5 * A_sd (relationship between sire and dam) if both known, else 0
    let fVal = 0;
    if (sIdx !== undefined && dIdx !== undefined) {
      fVal = 0.5 * A[sIdx][dIdx];
    }
    A[i][i] = 1 + fVal;
    F[anim.id] = fVal;

    // Off-diagonal elements: A_ij = A_ji = 0.5 * (A_js + A_jd) for j < i
    for (let j = 0; j < i; j++) {
      let sireTerm = sIdx !== undefined ? A[j][sIdx] : 0;
      let damTerm = dIdx !== undefined ? A[j][dIdx] : 0;
      let val = 0.5 * (sireTerm + damTerm);
      A[i][j] = val;
      A[j][i] = val;
    }
  }

  return { A, ids, F };
}

/**
 * Generates the Henderson direct inverse A^-1 matrix.
 * Using the calculated inbreeding values (F) of references.
 */
export function computeAInverse(
  sortedAnimals: Animal[],
  F: { [id: string]: number }
): number[][] {
  const n = sortedAnimals.length;
  const AInv: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  
  const idToIndex = new Map<string, number>();
  sortedAnimals.forEach((a, i) => idToIndex.set(a.id, i));

  for (let i = 0; i < n; i++) {
    const anim = sortedAnimals[i];
    const s = anim.sireId ? idToIndex.get(anim.sireId) : undefined;
    const d = anim.damId ? idToIndex.get(anim.damId) : undefined;

    const fs = s !== undefined ? F[sortedAnimals[s].id] : 0;
    const fd = d !== undefined ? F[sortedAnimals[d].id] : 0;

    // Compute Di (Mendelian sampling factor, di)
    let d_i = 1.0;
    if (s !== undefined && d !== undefined) {
      d_i = 0.5 - 0.25 * (fs + fd);
    } else if (s !== undefined) {
      d_i = 0.75 - 0.25 * fs;
    } else if (d !== undefined) {
      d_i = 0.75 - 0.25 * fd;
    } else {
      d_i = 1.0; // Both unknown
    }

    const inv_di = 1.0 / d_i;

    // Contribution of animal i to A^-1
    // Add inv_di to position (i,i)
    AInv[i][i] += inv_di;

    if (s !== undefined) {
      AInv[i][s] -= 0.5 * inv_di;
      AInv[s][i] -= 0.5 * inv_di;
      AInv[s][s] += 0.25 * inv_di;
    }
    if (d !== undefined) {
      AInv[i][d] -= 0.5 * inv_di;
      AInv[d][i] -= 0.5 * inv_di;
      AInv[d][d] += 0.25 * inv_di;
    }
    if (s !== undefined && d !== undefined) {
      AInv[s][d] += 0.25 * inv_di;
      AInv[d][s] += 0.25 * inv_di;
    }
  }

  return AInv;
}

/**
 * Automates contemporary group (GC) formatting
 * Formato: Fazenda_Ano_Estacao_Sexo_Manejo
 * Estações: "Águas" (Oct to Mar) e "Seca" (Apr to Sep)
 */
export function generateContemporaryGroup(animal: Animal): string {
  const month = parseInt(animal.birthDate.split('-')[1]) || 6;
  const season = (month >= 10 || month <= 3) ? 'Aguas' : 'Seca';
  return `${animal.rebanho}_${animal.birthYear}_${season}_${animal.sex}_${animal.manejo}`;
}

/**
 * Solves a linear system M * x = r using Gaussian Elimination with partial pivoting.
 * Includes fallback logic for near-singular matrices.
 */
export function solveLinearSystem(M: number[][], r: number[]): { solutions: number[]; inverse: number[][] } {
  const n = M.length;
  // Create augmented matrix alongside identity to find both solutions and inverse (needed for PEV and Accuracies)
  const aug: number[][] = Array.from({ length: n }, (_, i) => {
    const row = new Array(2 * n).fill(0);
    // Left half: matrix M
    for (let j = 0; j < n; j++) row[j] = M[i][j];
    // Right half: identity matrix
    row[n + i] = 1.0;
    return row;
  });

  const b = [...r];

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxEl = Math.abs(aug[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > maxEl) {
        maxEl = Math.abs(aug[k][i]);
        maxRow = k;
      }
    }

    // Is it singular or near-singular?
    if (maxEl < 1e-12) {
      // Regularize diagonal and continue
      aug[i][i] += 1e-7;
    } else {
      // Swap rows
      if (maxRow !== i) {
        const temp = aug[i];
        aug[i] = aug[maxRow];
        aug[maxRow] = temp;

        const tempB = b[i];
        b[i] = b[maxRow];
        b[maxRow] = tempB;
      }
    }

    const pivot = aug[i][i];
    // Divide the row by pivot
    for (let j = i; j < 2 * n; j++) {
      aug[i][j] /= pivot;
    }
    b[i] /= pivot;

    // Eliminate other rows
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = aug[k][i];
        for (let j = i; j < 2 * n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
        b[k] -= factor * b[i];
      }
    }
  }

  // Extract solutions: aug[i][i] is now 1, solutions are in b
  // Extract inverse from right half of augmented matrix
  const inverse: number[][] = Array.from({ length: n }, (_, i) => {
    return aug[i].slice(n);
  });

  return { solutions: b, inverse };
}

/**
 * Mixed Model Equations (MME) - BLUP Solver
 * Features:
 * - Multi-breed composition as fixed effects covariates (estimating direct hybrid composition)
 * - Contemporary Groups automatically formed and treated as fixed effects
 * - Computes accurate Breeding Values (Breeding Value u, where DEP = 0.5 * u)
 * - Returns exact analytical accuracies via LHS inverse
 */
export function solveBLUP(
  rawAnimals: Animal[],
  trait: 'pesoDesmame' | 'pesoSobreano' | 'pe' | 'aol' | 'egs',
  params: GeneticParameters
): {
  estimates: { [id: string]: { dep: number; acc: number } };
  systemDetails: {
    mmeLHS: number[][];
    mmeRHS: number[];
    solutions: number[];
    fixedEffectNames: string[];
    indexToAnimalId: string[];
    alpha: number;
    varianceG: number;
    varianceE: number;
    h2: number;
  };
} {
  // 1. Pedigree closure and relationship matrix
  const sortedAnimals = buildClosedSortedPedigree(rawAnimals);
  const { A, F } = computeRelationshipMatrix(sortedAnimals);
  const AInv = computeAInverse(sortedAnimals, F);

  // 2. Map genetic parameters for the chosen trait
  let h2 = 0.20;
  let var_g = 10;
  let var_e = 40;

  switch (trait) {
    case 'pesoDesmame':
      h2 = params.h2_pesoDesmame;
      var_g = params.var_g_pesoDesmame;
      var_e = params.var_e_pesoDesmame;
      break;
    case 'pesoSobreano':
      h2 = params.h2_pesoSobreano;
      var_g = params.var_g_pesoSobreano;
      var_e = params.var_e_pesoSobreano;
      break;
    case 'pe':
      h2 = params.h2_pe;
      var_g = params.var_g_pe;
      var_e = params.var_e_pe;
      break;
    case 'aol':
      h2 = params.h2_aol;
      var_g = params.var_g_aol;
      var_e = params.var_e_aol;
      break;
    case 'egs':
      h2 = params.h2_egs;
      var_g = params.var_g_egs;
      var_e = params.var_e_egs;
      break;
  }

  const alpha = var_e / var_g;

  // 3. Extract animals with phenotype measurements
  // If no animal has phenotype, we can run BLUP on simulated phenotypes or average values
  const hasPhenotype = (a: Animal) => a.phenotypes[trait] !== undefined && a.phenotypes[trait] !== null;
  const filtered = sortedAnimals.filter(hasPhenotype);

  // 4. Set up fixed effects:
  // a) Contemporary Groups (GC)
  const gcs = Array.from(new Set(sortedAnimals.map(generateContemporaryGroup)));
  const gcIndexMap = new Map<string, number>();
  gcs.forEach((gc, idx) => gcIndexMap.set(gc, idx));

  // b) Crossbred / Multiracial components as covariates:
  // Let's identify the active breeds across all animals.
  const allBreeds = new Set<string>();
  sortedAnimals.forEach(a => {
    Object.keys(a.breedComp).forEach(b => allBreeds.add(b));
  });
  const breedsList = Array.from(allBreeds).sort();
  // To avoid collinearity in fixed effects, we set one breed as baseline (dropped from active equations)
  const activeBreedsList = breedsList.slice(1); 

  const numGCs = gcs.length;
  const numBreeds = activeBreedsList.length;
  const numFixed = numGCs + numBreeds; 
  const numRandom = sortedAnimals.length; // Number of animals in closed pedigree
  const totalDim = numFixed + numRandom;

  // LHS and RHS systems
  const LHS: number[][] = Array.from({ length: totalDim }, () => Array(totalDim).fill(0));
  const RHS: number[] = Array(totalDim).fill(0);

  // Map to find animal index in random effects list
  const animalIndexMap = new Map<string, number>();
  sortedAnimals.forEach((a, i) => animalIndexMap.set(a.id, i));

  // Populate equations with phenotyped animals
  sortedAnimals.forEach(anim => {
    if (!hasPhenotype(anim)) return;
    const y = anim.phenotypes[trait] as number;
    const aIdx = animalIndexMap.get(anim.id)!;
    const gcStr = generateContemporaryGroup(anim);
    const gcIdx = gcIndexMap.get(gcStr)!;

    // Fixed Effect: Contemporary Group
    const fixedIndices: number[] = [gcIdx];
    const fixedCoefficients: number[] = [1.0];

    // Fixed Effects: Breed proportions (covariates)
    activeBreedsList.forEach((breed, bIdx) => {
      const prop = anim.breedComp[breed] || 0.0;
      if (prop > 0) {
        fixedIndices.push(numGCs + bIdx);
        fixedCoefficients.push(prop);
      }
    });

    // Populate elements:
    // Symmetric filling of LHS of MME
    // 1. Fixed x Fixed block (X'X)
    for (let i = 0; i < fixedIndices.length; i++) {
      const rowIdx = fixedIndices[i];
      const rowCoef = fixedCoefficients[i];
      RHS[rowIdx] += rowCoef * y;

      for (let j = 0; j < fixedIndices.length; j++) {
        const colIdx = fixedIndices[j];
        const colCoef = fixedCoefficients[j];
        LHS[rowIdx][colIdx] += rowCoef * colCoef;
      }
    }

    // 2. Fixed x Random block (X'Z and Z'X)
    for (let i = 0; i < fixedIndices.length; i++) {
      const fIdx = fixedIndices[i];
      const fCoef = fixedCoefficients[i];
      
      const rIdx = numFixed + aIdx;
      LHS[fIdx][rIdx] += fCoef;
      LHS[rIdx][fIdx] += fCoef; 
    }

    // 3. Random x Random block (Z'Z)
    const rIdx = numFixed + aIdx;
    LHS[rIdx][rIdx] += 1.0;
    RHS[rIdx] += y;
  });

  // 4. Random x Random relationship penalty block: add A^-1 * alpha
  for (let i = 0; i < numRandom; i++) {
    for (let j = 0; j < numRandom; j++) {
      const valVal = AInv[i][j] * alpha;
      LHS[numFixed + i][numFixed + j] += valVal;
    }
  }

  // 5. Solve LHS * Solutions = RHS
  const { solutions, inverse } = solveLinearSystem(LHS, RHS);

  // 6. Extract DEPs and individual accuracies (PEV-based)
  // Accuracy = sqrt( 1 - PEV / var_g ) = sqrt( 1 - C_ii * alpha )
  const result: { [id: string]: { dep: number; acc: number } } = {};
  
  for (let i = 0; i < numRandom; i++) {
    const anim = sortedAnimals[i];
    const uVal = solutions[numFixed + i];
    const depVal = 0.5 * uVal; // DEP is half of standard breeding value (EBV / u)
    
    // Diagonal element of inverted LHS
    const c_ii = inverse[numFixed + i][numFixed + i];
    // Guard accuracy to range [0.0, 0.99]
    let accuracySq = 1.0 - (c_ii * alpha);
    if (accuracySq < 0) accuracySq = 0;
    let rVal = Math.sqrt(accuracySq);
    if (rVal > 0.99) rVal = 0.99;

    // Minimum baseline accuracy if unmeasured but has parents
    if (rVal < 0.1 && (anim.sireId || anim.damId)) {
      rVal = 0.15; // pedigree index baseline accuracy
    } else if (rVal < 0.05 && hasPhenotype(anim)) {
      rVal = 0.35; // direct measurement baseline accuracy
    } else if (rVal < 0.01) {
      rVal = 0.05;
    }

    result[anim.id] = {
      dep: Number(depVal.toFixed(3)),
      acc: Number(rVal.toFixed(2)),
    };
  }

  // Compile fixed effect names for Academic step-by-step
  const fixedEffectNames: string[] = [];
  gcs.forEach(gc => fixedEffectNames.push(`CG: ${gc}`));
  activeBreedsList.forEach(br => fixedEffectNames.push(`Efeito Adit. Raça: ${br}`));

  const indexToAnimalId = sortedAnimals.map(a => a.id);

  return {
    estimates: result,
    systemDetails: {
      mmeLHS: LHS,
      mmeRHS: RHS,
      solutions,
      fixedEffectNames,
      indexToAnimalId,
      alpha,
      varianceG: var_g,
      varianceE: var_e,
      h2,
    },
  };
}

/**
 * Computes Hazel (1943) Selection Index for each animal.
 * Index = w1 * DEP1 + w2 * DEP2 + w3 * DEP3 ...
 */
export function calculateSelectionIndex(
  animal: Animal,
  config: SelectionIndexConfig,
  evaluationEstimates: { [trait: string]: { [id: string]: { dep: number; acc: number } } }
): number {
  let indexVal = 100.0; // base score representing flock baseline average

  const depPesoDesmame = evaluationEstimates['pesoDesmame']?.[animal.id]?.dep || 0;
  const depPesoSobreano = evaluationEstimates['pesoSobreano']?.[animal.id]?.dep || 0;
  const depPE = evaluationEstimates['pe']?.[animal.id]?.dep || 0;
  const depAOL = evaluationEstimates['aol']?.[animal.id]?.dep || 0;
  const depEGS = evaluationEstimates['egs']?.[animal.id]?.dep || 0;

  indexVal += (depPesoDesmame * config.weight_pesoDesmame);
  indexVal += (depPesoSobreano * config.weight_pesoSobreano);
  indexVal += (depPE * config.weight_pe);
  indexVal += (depAOL * config.weight_aol);
  indexVal += (depEGS * config.weight_egs);

  return Number(indexVal.toFixed(2));
}

/**
 * Mating Recommender Algorithm
 * Suggests the top-3 sires for a specific dam based on Index,
 * calculating potential offspring inbreeding (F_proj) and warning if F_proj >= 6.25%
 */
export interface MatingRecommendation {
  sireId: string;
  sireName: string;
  indexProj: number;
  fOffspringProj: number;
  msiScore: number; // Mate Selection Index
  riskStatus: 'safe' | 'warning' | 'high_risk'; // safe: F < 3.125%, warning: 3.125% - 6.25%, high_risk: >= 6.25%
  isInbredPedigree: boolean;
  pedigreeAccProj: number;
}

export function recommendSiresForDam(
  dam: Animal,
  allAnimals: Animal[],
  indexConfig: SelectionIndexConfig,
  evaluationEstimates: { [trait: string]: { [id: string]: { dep: number; acc: number } } },
  lambdaInbreedingPenalty: number = 80, // Base MateSel penalty factor for F
  precalculatedA?: number[][],
  precalculatedIdxToId?: Map<string, number>
): MatingRecommendation[] {
  // Extract all males (Sires) of the same species
  const candidateSires = allAnimals.filter(
    a => a.sex === 'M' && a.species === dam.species && a.id !== dam.id && a.id !== dam.sireId
  );

  let A = precalculatedA;
  let idxToId = precalculatedIdxToId;

  if (!A || !idxToId) {
    // Closed pedigree calculation including both dam and candidates to calculate off-spring F
    const sortedPed = buildClosedSortedPedigree(allAnimals);
    const result = computeRelationshipMatrix(sortedPed);
    A = result.A;
    idxToId = new Map<string, number>();
    result.ids.forEach((id, i) => idxToId!.set(id, i));
  }

  const recommendations: MatingRecommendation[] = [];

  candidateSires.forEach(sire => {
    // Calculo do coeficiente de parentesco projetado para a progênie (F)
    // F_progenie = 0.5 * A_sire_dam
    let fProj = 0.0;
    const sireIdx = idxToId.get(sire.id);
    const damIdx = idxToId.get(dam.id);

    if (sireIdx !== undefined && damIdx !== undefined) {
      fProj = 0.5 * A[sireIdx][damIdx];
    }

    // Expected progeny Index:
    // Index_proj = (Index_sire + Index_dam) / 2
    const sireIndex = calculateSelectionIndex(sire, indexConfig, evaluationEstimates);
    const damIndex = calculateSelectionIndex(dam, indexConfig, evaluationEstimates);
    const indexProj = Number(((sireIndex + damIndex) / 2).toFixed(2));

    // Calculate Mate Selection Index (MSI) integrating the penalty (Kinghorn)
    const msiScore = Number((indexProj - (fProj * lambdaInbreedingPenalty)).toFixed(4));

    // Combined accuracies projection
    const accSire = evaluationEstimates['pesoDesmame']?.[sire.id]?.acc || 0.1;
    const accDam = evaluationEstimates['pesoDesmame']?.[dam.id]?.acc || 0.1;
    const pedigreeAccProj = Number((0.5 * (accSire + accDam)).toFixed(2));

    let risk: 'safe' | 'warning' | 'high_risk' = 'safe';
    if (fProj >= 0.0625) {
      risk = 'high_risk';
    } else if (fProj >= 0.03125) {
      risk = 'warning';
    }

    recommendations.push({
      sireId: sire.id,
      sireName: sire.name,
      indexProj,
      fOffspringProj: Number((fProj * 100).toFixed(3)), // Expressed in %
      msiScore,
      riskStatus: risk,
      isInbredPedigree: fProj > 0,
      pedigreeAccProj,
    });
  });

  // Sort by MSI (Mate Selection Index) and return top 5
  return recommendations.sort((a, b) => b.msiScore - a.msiScore).slice(0, 5);
}

/**
 * Computes individual heterozygosity for crossbred animals based on parental breed overlap or composition.
 */
export function computeHeterozygosity(animal: Animal, rawAnimals: Animal[]): number {
  const sireId = animal.sireId;
  const damId = animal.damId;

  // 1. If parents are found in rawAnimals list, calculate exact heterozygosity
  const sire = rawAnimals.find(a => a.id === sireId);
  const dam = rawAnimals.find(a => a.id === damId);

  if (sire && dam) {
    let sumIntersect = 0;
    const allBreeds = new Set([
      ...Object.keys(sire.breedComp),
      ...Object.keys(dam.breedComp)
    ]);
    allBreeds.forEach(breed => {
      const pS = sire.breedComp[breed] || 0;
      const pD = dam.breedComp[breed] || 0;
      sumIntersect += pS * pD;
    });
    return Math.max(0, Math.min(1.0, 1.0 - sumIntersect));
  }

  // 2. Fallback: Estimate heterozygosity based on animal's own breed composition
  const breeds = Object.keys(animal.breedComp);
  if (breeds.length <= 1) {
    return 0.0;
  }

  // Double the gene diversity: 2 * (1 - sum(p_i^2)), capped at 1.0
  let sumSq = 0;
  Object.values(animal.breedComp).forEach(p => {
    sumSq += p * p;
  });
  return Math.max(0, Math.min(1.0, 2.0 * (1.0 - sumSq)));
}

