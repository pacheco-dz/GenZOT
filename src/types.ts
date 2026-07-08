/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Species = 'bovino';
export type Sex = 'M' | 'F';

export interface BreedComposition {
  [breedName: string]: number; // Breed Name -> Proportion (0.0 to 1.0), must sum to 1.0
}

export interface Phenotypes {
  // Productive traits
  pesoNascimento?: number | null; // kg
  pesoDesmame?: number | null; // kg
  pesoSobreano?: number | null; // kg
  gmd?: number | null; // Average Daily Gain (g/day)

  // Reproductive traits
  pe?: number | null; // Scrotal circumference (cm)
  ipp?: number | null; // Age at first calving/lambing (days)
  iep?: number | null; // Calving/lambing interval (days)

  // Carcass traits
  aol?: number | null; // Ribeye area (cm²)
  egs?: number | null; // Backfat thickness (mm)
  marmoreio?: number | null; // Marbling %

  // Eficiência, Temperamento e Adaptabilidade (Novas características cruciais)
  car?: number | null; // Consumo Alimentar Residual (kg/MS/dia - menor é mais eficiente)
  temperamento?: number | null; // Docilidade / Reatividade (escore 1 a 5, onde 1 é muito dócil e 5 é muito reativo)
  resistenciaCarrapato?: number | null; // Escore de Resistência a Carrapatos (escore 1 a 5, onde 1 é suscetível e 5 é muito resistente)
  stayability?: number | null; // Longevidade da fêmea no rebanho (% de chance de permanecer produtiva)

  // EPMUR (Bovinos de Corte): E (Estrutura), P (Precocidade), M (Musculatura), U (Umbigo), R (Caracteres Raciais) [1 to 5]
  epmur_E?: number | null;
  epmur_P?: number | null;
  epmur_M?: number | null;
  epmur_U?: number | null;
  epmur_R?: number | null;
}

export interface Animal {
  id: string;
  name: string;
  species: Species;
  sex: Sex;
  birthDate: string;
  birthYear: number;
  sireId: string | null; // Father ID
  damId: string | null;  // Mother ID
  breedComp: BreedComposition;
  rebanho: string;       // Herd/Fazenda Name
  manejo: string;        // Management group code (diet, grass, feedlot)
  phenotypes: Phenotypes;
  rfid?: string;          // RFID electronic tag (e.g. ISO 11784/11785)
  genomicTested?: boolean; // Indicates if the animal has a DNA sample/SNP panel analyzed
  gepds?: {               // Genomic EPDs (gDEPs/gEPDs) combining pedigrees + molecular data
    pesoDesmame?: number;
    pesoSobreano?: number;
    pe?: number;
    aol?: number;
    egs?: number;
  };
  genomicAccuracies?: {   // Much higher accuracy than traditional pedigree-only estimates
    pesoDesmame?: number;
    pesoSobreano?: number;
    pe?: number;
    aol?: number;
    egs?: number;
  };
  
  // Solved evaluations (computed dynamically based on selected populations or heritability settings)
  f_inbreeding?: number; // Inbreeding Coefficient F
  heterozygosity?: number; // Heterozygosity Coefficient (0.0 to 1.0)
  deps?: {
    pesoDesmame?: number;
    pesoSobreano?: number;
    pe?: number;
    aol?: number;
    egs?: number;
  };
  accuracies?: {
    pesoDesmame?: number;
    pesoSobreano?: number;
    pe?: number;
    aol?: number;
    egs?: number;
  };
}

// Global Genetic Parameters (for educational purposes and active BLUP calculations)
export interface GeneticParameters {
  h2_pesoDesmame: number; // heritability
  h2_pesoSobreano: number;
  h2_pe: number;
  h2_aol: number;
  h2_egs: number;
  
  var_g_pesoDesmame: number; // genetic additive variance
  var_g_pesoSobreano: number;
  var_g_pe: number;
  var_g_aol: number;
  var_g_egs: number;

  var_e_pesoDesmame: number; // environmental variance
  var_e_pesoSobreano: number;
  var_e_pe: number;
  var_e_aol: number;
  var_e_egs: number;
}

// User-customized Selection Index Configuration (Hazel, 1943)
export interface SelectionIndexConfig {
  name: string;
  weight_pesoDesmame: number; // Relative economic value
  weight_pesoSobreano: number;
  weight_pe: number;
  weight_aol: number;
  weight_egs: number;
}
