/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Animal, Species, Sex } from '../types';
import { generateContemporaryGroup } from '../utils/math';
import { Plus, Trash2, Pencil, Filter, Ruler, Info, RefreshCw, AlertTriangle, Search, FileSpreadsheet, Download, Upload, Radio, Scale, Dna, Sparkles, BookOpen, Award, HelpCircle, CheckCircle, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DataSectionProps {
  animals: Animal[];
  onAddAnimal: (animal: Animal) => void;
  onDeleteAnimal: (id: string) => void;
  onResetData: () => void;
  onUpdateAnimal: (id: string, updatedAnimal: Animal) => void;
  selectedSpecies?: Species | 'all';
  onSelectedSpeciesChange?: (species: Species | 'all') => void;
  viewMode?: 'producer' | 'academic';
}

export default function DataSection({ 
  animals, 
  onAddAnimal, 
  onDeleteAnimal, 
  onResetData, 
  onUpdateAnimal,
  selectedSpecies: propSelectedSpecies,
  onSelectedSpeciesChange,
  viewMode = 'producer'
}: DataSectionProps) {
  const [localSpecies, setLocalSpecies] = useState<Species | 'all'>('all');
  const selectedSpecies = propSelectedSpecies !== undefined ? propSelectedSpecies : localSpecies;
  const setSelectedSpecies = onSelectedSpeciesChange !== undefined ? onSelectedSpeciesChange : setLocalSpecies;
  const [showAddForm, setShowAddForm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [bypassPedigreeWarning, setBypassPedigreeWarning] = useState(false);
  const [bypassEditPedigreeWarning, setBypassEditPedigreeWarning] = useState(false);

  // Academic view mode sub-tab: 'didactic' (simulations) vs 'traditional' (data table)
  const [academicSubTab, setAcademicSubTab] = useState<'didactic' | 'traditional'>('didactic');

  // Breeder's Equation (Equação do Criador) states
  const [breedersTrait, setBreedersTrait] = useState<'pd' | 'pe' | 'gmd' | 'custom'>('pd');
  const [breedersH2, setBreedersH2] = useState(0.25);
  const [breedersSD, setBreedersSD] = useState(30); // selection differential in kg or cm/cm2
  const [breedersL, setBreedersL] = useState(5.5); // generation interval in years
  const [breedersLMode, setBreedersLMode] = useState<'manual' | 'database'>('manual');

  // Calculate generation interval from registered animals in the database
  const { databaseL, databaseStats } = useMemo(() => {
    const sireAges: number[] = [];
    const damAges: number[] = [];
    const allAges: number[] = [];
    
    const animalMap = new Map<string, Animal>();
    animals.forEach(a => animalMap.set(a.id, a));

    animals.forEach(animal => {
      const oYear = animal.birthYear || (animal.birthDate ? new Date(animal.birthDate).getFullYear() : null);
      if (!oYear) return;

      if (animal.sireId && animalMap.has(animal.sireId)) {
        const sire = animalMap.get(animal.sireId)!;
        const pYear = sire.birthYear || (sire.birthDate ? new Date(sire.birthDate).getFullYear() : null);
        if (pYear && oYear > pYear) {
          const age = oYear - pYear;
          if (age > 0 && age < 25) {
            sireAges.push(age);
            allAges.push(age);
          }
        }
      }

      if (animal.damId && animalMap.has(animal.damId)) {
        const dam = animalMap.get(animal.damId)!;
        const pYear = dam.birthYear || (dam.birthDate ? new Date(dam.birthDate).getFullYear() : null);
        if (pYear && oYear > pYear) {
          const age = oYear - pYear;
          if (age > 0 && age < 25) {
            damAges.push(age);
            allAges.push(age);
          }
        }
      }
    });

    const avgSireAge = sireAges.length > 0 ? (sireAges.reduce((acc, v) => acc + v, 0) / sireAges.length) : null;
    const avgDamAge = damAges.length > 0 ? (damAges.reduce((acc, v) => acc + v, 0) / damAges.length) : null;
    const overallL = allAges.length > 0 ? (allAges.reduce((acc, v) => acc + v, 0) / allAges.length) : null;

    return {
      databaseL: overallL,
      databaseStats: {
        totalPairs: allAges.length,
        avgSireAge,
        avgDamAge
      }
    };
  }, [animals]);

  const activeL = breedersLMode === 'database' ? (databaseL !== null ? databaseL : 5.5) : breedersL;

  // Variance decomposition states for genetic parameters
  const [varianceVg, setVarianceVg] = useState(120); // Additive genetic variance
  const [varianceVe, setVarianceVe] = useState(360); // Environmental variance
  const [varianceTraitPreset, setVarianceTraitPreset] = useState<'reprodutivo' | 'crescimento' | 'carcaca' | 'custom'>('crescimento');
  const [studentAnimalWeight, setStudentAnimalWeight] = useState(230); // in kg
  const [studentGroupAverage, setStudentGroupAverage] = useState(200); // in kg

  // Zootecnia Quiz states
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // GC Simulation States
  const [gcSimAnimals, setGcSimAnimals] = useState([
    { id: 'AN-01', name: 'Bezerro Titan', birthMonth: 10, sex: 'M', rebanho: 'Pampa', manejo: 'Pasto', weight: 195 },
    { id: 'AN-02', name: 'Bezerra Flora', birthMonth: 11, sex: 'F', rebanho: 'Pampa', manejo: 'Pasto', weight: 185 },
    { id: 'AN-03', name: 'Bezerro Radar', birthMonth: 11, sex: 'M', rebanho: 'Pampa', manejo: 'Pasto', weight: 215 },
    { id: 'AN-04', name: 'Bezerro Confi', birthMonth: 10, sex: 'M', rebanho: 'Pampa', manejo: 'Confinado', weight: 245 },
    { id: 'AN-05', name: 'Bezerra Gaia', birthMonth: 10, sex: 'F', rebanho: 'Pampa', manejo: 'Pasto', weight: 175 },
    { id: 'AN-06', name: 'Bezerro Sol', birthMonth: 5, sex: 'M', rebanho: 'Pampa', manejo: 'Pasto', weight: 160 },
  ]);

  // Heterosis / Crossbreeding simulation states
  const [sireBreedPreset, setSireBreedPreset] = useState('nelore_puro');
  const [damBreedPreset, setDamBreedPreset] = useState('nelore_puro');

  // Custom slide values (percentages summing to 100)
  const [sireNelore, setSireNelore] = useState(100);
  const [sireAngus, setSireAngus] = useState(0);
  const [sireSenepol, setSireSenepol] = useState(0);

  const [damNelore, setDamNelore] = useState(100);
  const [damAngus, setDamAngus] = useState(0);
  const [damSenepol, setDamSenepol] = useState(0);

  // Template Excel Download Handler
  const handleDownloadTemplate = () => {
    const headers = [
      'ID', 'Nome', 'Especie', 'Sexo', 'Data_Nascimento', 'Rebanho', 
      'Manejo', 'ID_Pai', 'ID_Mae', 'Raca1', 'Pct1', 'Raca2', 'Pct2', 'Raca3', 'Pct3',
      'Peso_Nascimento', 'Peso_Desmame', 'Peso_Sobreano', 'Perimetro_Escrotal',
      'Area_Olho_Lombo', 'Espessura_Gordura_Subcutanea', 'Score_C_E', 'Score_P_P', 'Score_M_M',
      'CAR', 'Temperamento', 'Resistencia_Carrapato', 'Stayability'
    ];

    const sampleData = [
      {
        'ID': 'BOV-E01',
        'Nome': 'GenoTouro Alfa',
        'Especie': 'bovino',
        'Sexo': 'M',
        'Data_Nascimento': '2024-02-10',
        'Rebanho': 'Fazenda_Pampa',
        'Manejo': 'Pasto',
        'ID_Pai': 'BOV-F01',
        'ID_Mae': 'BOV-M01',
        'Raca1': 'Nelore',
        'Pct1': 100,
        'Raca2': '',
        'Pct2': 0,
        'Raca3': '',
        'Pct3': 0,
        'Peso_Nascimento': 32.5,
        'Peso_Desmame': 210,
        'Peso_Sobreano': 380,
        'Perimetro_Escrotal': 34,
        'Area_Olho_Lombo': 75.2,
        'Espessura_Gordura_Subcutanea': 4.5,
        'Score_C_E': 4,
        'Score_P_P': 4,
        'Score_M_M': 3,
        'CAR': -0.15,
        'Temperamento': 2,
        'Resistencia_Carrapato': 4,
        'Stayability': 85.0
      },
      {
        'ID': 'BOV-E02',
        'Nome': 'GenoNovilha Beta',
        'Especie': 'bovino',
        'Sexo': 'F',
        'Data_Nascimento': '2024-03-15',
        'Rebanho': 'Fazenda_Pampa',
        'Manejo': 'Pasto',
        'ID_Pai': 'BOV-F02',
        'ID_Mae': 'BOV-M02',
        'Raca1': 'Angus',
        'Pct1': 100,
        'Raca2': '',
        'Pct2': 0,
        'Raca3': '',
        'Pct3': 0,
        'Peso_Nascimento': 30.2,
        'Peso_Desmame': 195.5,
        'Peso_Sobreano': 340.0,
        'Perimetro_Escrotal': '',
        'Area_Olho_Lombo': 68.5,
        'Espessura_Gordura_Subcutanea': 5.2,
        'Score_C_E': 3,
        'Score_P_P': 4,
        'Score_M_M': 4,
        'CAR': -0.05,
        'Temperamento': 1,
        'Resistencia_Carrapato': 3,
        'Stayability': 79.5
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Plantel');
    XLSX.writeFile(workbook, 'genzot_template_campo.xlsx');
  };

  // Upload Excel Handler
  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        if (rows.length === 0) {
          alert('Nenhum dado encontrado na planilha.');
          return;
        }

        let importedCount = 0;
        let errorMessages: string[] = [];

        rows.forEach((row: any, idx: number) => {
          const rowNum = idx + 2;
          const rawId = row['ID'] || row['id'];
          if (!rawId) {
            errorMessages.push(`Linha ${rowNum}: ID ausente.`);
            return;
          }

          const cleanId = String(rawId).trim().toUpperCase();
          if (animals.some(a => a.id === cleanId)) {
            errorMessages.push(`Linha ${rowNum}: O animal com ID ${cleanId} já existe no rebanho.`);
            return;
          }

          const name = String(row['Nome'] || row['nome'] || `Animal ${cleanId}`).trim();
          const species = 'bovino' as Species;

          const sex = String(row['Sexo'] || row['sexo'] || 'M').toUpperCase().trim() as Sex;
          if (sex !== 'M' && sex !== 'F') {
            errorMessages.push(`Linha ${rowNum}: Sexo inválido ('${sex}'). Deve ser 'M' ou 'F'.`);
            return;
          }

          const birthDate = String(row['Data_Nascimento'] || row['data_nascimento'] || '2024-01-01').trim();
          const birthYear = parseInt(birthDate.substring(0, 4)) || 2024;

          const rebanho = String(row['Rebanho'] || row['rebanho'] || 'Fazenda_Pampa').trim();
          const manejo = String(row['Manejo'] || row['manejo'] || 'Pasto').trim();

          const sireId = row['ID_Pai'] || row['id_pai'] ? String(row['ID_Pai'] || row['id_pai']).trim().toUpperCase() : null;
          const damId = row['ID_Mae'] || row['id_mae'] ? String(row['ID_Mae'] || row['id_mae']).trim().toUpperCase() : null;

          // Extract breed composition
          const breedComp: Record<string, number> = {};
          const raca1 = String(row['Raca1'] || row['raca1'] || '').trim();
          const pct1 = parseFloat(row['Pct1'] || row['pct1']) || 100;
          const raca2 = String(row['Raca2'] || row['raca2'] || '').trim();
          const pct2 = parseFloat(row['Pct2'] || row['pct2']) || 0;
          const raca3 = String(row['Raca3'] || row['raca3'] || '').trim();
          const pct3 = parseFloat(row['Pct3'] || row['pct3']) || 0;

          const b1 = raca1;
          const b2 = raca2;
          const b3 = raca3;
          let p1 = pct1;
          let p2 = b2 ? pct2 : 0;
          let p3 = b3 ? pct3 : 0;

          if (b1) {
            const totalPct = p1 + p2 + p3;
            if (totalPct > 0) {
              breedComp[b1] = p1 / totalPct;
              if (b2 && p2 > 0) breedComp[b2] = p2 / totalPct;
              if (b3 && p3 > 0) breedComp[b3] = p3 / totalPct;
            } else {
              breedComp[b1] = 1.0;
            }
          } else {
            breedComp['Nelore'] = 1.0;
          }

          // Parse phenotypes
          const phenotypes: any = {
            scores: {
              score1: parseInt(row['Score_C_E'] || row['score_c_e']) || 3,
              score2: parseInt(row['Score_P_P'] || row['score_p_p']) || 3,
              score3: parseInt(row['Score_M_M'] || row['score_m_m']) || 3
            }
          };

          const pn = row['Peso_Nascimento'] || row['peso_nascimento'];
          const pd = row['Peso_Desmame'] || row['peso_desmame'];
          const ps = row['Peso_Sobreano'] || row['peso_sobreano'];
          const pe = row['Perimetro_Escrotal'] || row['perimetro_escrotal'];
          const aol = row['Area_Olho_Lombo'] || row['area_olho_lombo'];
          const egs = row['Espessura_Gordura_Subcutanea'] || row['espessura_gordura_subcutanea'];

          if (pn !== undefined && pn !== '') {
            phenotypes.pn = parseFloat(pn);
            phenotypes.pesoNascimento = parseFloat(pn);
          }
          if (pd !== undefined && pd !== '') {
            phenotypes.pd = parseFloat(pd);
            phenotypes.pesoDesmame = parseFloat(pd);
          }
          if (ps !== undefined && ps !== '') {
            phenotypes.ps = parseFloat(ps);
            phenotypes.pesoSobreano = parseFloat(ps);
          }
          if (pe !== undefined && pe !== '') {
            phenotypes.pe = parseFloat(pe);
          }
          if (aol !== undefined && aol !== '') {
            phenotypes.aol = parseFloat(aol);
          }
          if (egs !== undefined && egs !== '') {
            phenotypes.egs = parseFloat(egs);
          }

          const car = row['CAR'] || row['car'];
          const temperamento = row['Temperamento'] || row['temperamento'];
          const resistencia = row['Resistencia_Carrapato'] || row['resistencia_carrapato'];
          const stayability = row['Stayability'] || row['stayability'];

          if (car !== undefined && car !== '') {
            phenotypes.car = parseFloat(car);
          }
          if (temperamento !== undefined && temperamento !== '') {
            phenotypes.temperamento = parseInt(temperamento);
          }
          if (resistencia !== undefined && resistencia !== '') {
            phenotypes.resistenciaCarrapato = parseInt(resistencia);
          }
          if (stayability !== undefined && stayability !== '') {
            phenotypes.stayability = parseFloat(stayability);
          }

          // Add species-specific CPM/EPMUR scores for the UI display
          phenotypes.epmur_E = phenotypes.scores.score1;
          phenotypes.epmur_P = phenotypes.scores.score2;
          phenotypes.epmur_M = phenotypes.scores.score3;
          phenotypes.epmur_U = 3;
          phenotypes.epmur_R = 4;

          // Compute daily average gain (GMD) if possible
          if (phenotypes.pesoSobreano && phenotypes.pesoDesmame) {
            phenotypes.gmd = Math.round(((phenotypes.pesoSobreano - phenotypes.pesoDesmame) / 160) * 1000);
          }

          const newAnimal: Animal = {
            id: cleanId,
            name,
            species,
            sex,
            birthDate,
            birthYear,
            sireId,
            damId,
            breedComp,
            rebanho,
            manejo,
            phenotypes
          };

          onAddAnimal(newAnimal);
          importedCount++;
        });

        if (importedCount > 0) {
          alert(`${importedCount} animais importados com sucesso!`);
        }
        if (errorMessages.length > 0) {
          alert(`Ocorreram alguns avisos ou erros na importação:\n\n` + errorMessages.slice(0, 10).join('\n') + (errorMessages.length > 10 ? '\n...e outros ' + (errorMessages.length - 10) + ' erros.' : ''));
        }
      } catch (err: any) {
        alert('Erro ao processar arquivo Excel. Certifique-se de usar um arquivo .xlsx válido construído com base no nosso template padrão. Erro: ' + err?.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Form State
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('bovino');
  const [sex, setSex] = useState<Sex>('M');
  const [birthDate, setBirthDate] = useState('2023-08-15');
  const [sireId, setSireId] = useState('');
  const [damId, setDamId] = useState('');
  const [rebanho, setRebanho] = useState('Fazenda_Pampa');
  const [manejo, setManejo] = useState('Pasto');

  // Breed Composition inputs
  const [breed1, setBreed1] = useState('');
  const [pct1, setPct1] = useState(100);
  const [breed2, setBreed2] = useState('');
  const [pct2, setPct2] = useState(0);
  const [breed3, setBreed3] = useState('');
  const [pct3, setPct3] = useState(0);

  // Phenotypes State
  const [pn, setPn] = useState<number | ''>('');
  const [pd, setPd] = useState<number | ''>('');
  const [ps, setPs] = useState<number | ''>('');
  const [pe, setPe] = useState<number | ''>('');
  const [aol, setAol] = useState<number | ''>('');
  const [egs, setEgs] = useState<number | ''>('');
  const [car, setCar] = useState<number | ''>('');
  const [temperamento, setTemperamento] = useState<number | ''>('');
  const [resistenciaCarrapato, setResistenciaCarrapato] = useState<number | ''>('');
  const [stayability, setStayability] = useState<number | ''>('');

  // Editing Animal State
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [editName, setEditName] = useState('');
  const [editSex, setEditSex] = useState<Sex>('M');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editSireId, setEditSireId] = useState('');
  const [editDamId, setEditDamId] = useState('');
  const [editBreed1, setEditBreed1] = useState('');
  const [editPct1, setEditPct1] = useState(100);
  const [editBreed2, setEditBreed2] = useState('');
  const [editPct2, setEditPct2] = useState(0);
  const [editBreed3, setEditBreed3] = useState('');
  const [editPct3, setEditPct3] = useState(0);
  const [editRebanho, setEditRebanho] = useState('');
  const [editManejo, setEditManejo] = useState('Pasto');
  const [editPn, setEditPn] = useState<number | ''>('');
  const [editPd, setEditPd] = useState<number | ''>('');
  const [editPs, setEditPs] = useState<number | ''>('');
  const [editPe, setEditPe] = useState<number | ''>('');
  const [editAol, setEditAol] = useState<number | ''>('');
  const [editEgs, setEditEgs] = useState<number | ''>('');
  const [editCar, setEditCar] = useState<number | ''>('');
  const [editTemperamento, setEditTemperamento] = useState<number | ''>('');
  const [editResistenciaCarrapato, setEditResistenciaCarrapato] = useState<number | ''>('');
  const [editStayability, setEditStayability] = useState<number | ''>('');
  const [editScore1, setEditScore1] = useState(3);
  const [editScore2, setEditScore2] = useState(3);
  const [editScore3, setEditScore3] = useState(3);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);

  const startEditing = (a: Animal) => {
    setEditingAnimal(a);
    setEditName(a.name || '');
    setEditSex(a.sex);
    setEditBirthDate(a.birthDate || '');
    setEditSireId(a.sireId || '');
    setEditDamId(a.damId || '');
    setBypassEditPedigreeWarning(false);
    
    // Breed comp extraction
    const breeds = Object.entries(a.breedComp || {});
    if (breeds.length > 0) {
      setEditBreed1(breeds[0][0]);
      setEditPct1(Math.round(breeds[0][1] * 100));
    } else {
      setEditBreed1('Nelore');
      setEditPct1(100);
    }
    
    if (breeds.length > 1) {
      setEditBreed2(breeds[1][0]);
      setEditPct2(Math.round(breeds[1][1] * 100));
    } else {
      setEditBreed2('');
      setEditPct2(0);
    }

    if (breeds.length > 2) {
      setEditBreed3(breeds[2][0]);
      setEditPct3(Math.round(breeds[2][1] * 100));
    } else {
      setEditBreed3('');
      setEditPct3(0);
    }
    
    setEditRebanho(a.rebanho || '');
    setEditManejo(a.manejo || 'Pasto');
    
    setEditPn(a.phenotypes.pesoNascimento !== undefined && a.phenotypes.pesoNascimento !== null ? a.phenotypes.pesoNascimento : '');
    setEditPd(a.phenotypes.pesoDesmame !== undefined && a.phenotypes.pesoDesmame !== null ? a.phenotypes.pesoDesmame : '');
    setEditPs(a.phenotypes.pesoSobreano !== undefined && a.phenotypes.pesoSobreano !== null ? a.phenotypes.pesoSobreano : '');
    setEditPe(a.phenotypes.pe !== undefined && a.phenotypes.pe !== null ? a.phenotypes.pe : '');
    setEditAol(a.phenotypes.aol !== undefined && a.phenotypes.aol !== null ? a.phenotypes.aol : '');
    setEditEgs(a.phenotypes.egs !== undefined && a.phenotypes.egs !== null ? a.phenotypes.egs : '');
    setEditCar(a.phenotypes.car !== undefined && a.phenotypes.car !== null ? a.phenotypes.car : '');
    setEditTemperamento(a.phenotypes.temperamento !== undefined && a.phenotypes.temperamento !== null ? a.phenotypes.temperamento : '');
    setEditResistenciaCarrapato(a.phenotypes.resistenciaCarrapato !== undefined && a.phenotypes.resistenciaCarrapato !== null ? a.phenotypes.resistenciaCarrapato : '');
    setEditStayability(a.phenotypes.stayability !== undefined && a.phenotypes.stayability !== null ? a.phenotypes.stayability : '');
    
    setEditScore1(a.phenotypes.epmur_E || 3);
    setEditScore2(a.phenotypes.epmur_P || 3);
    setEditScore3(a.phenotypes.epmur_M || 3);
    
    setEditValidationError(null);
  };

  const handleEditFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnimal) return;
    setEditValidationError(null);
    
    const birthYearVal = parseInt(editBirthDate.split('-')[0]) || 2023;
    const finalSireId = editSireId.trim() ? editSireId.toUpperCase().trim() : null;
    const finalDamId = editDamId.trim() ? editDamId.toUpperCase().trim() : null;
    const finalId = editingAnimal.id; // keeps original ID

    if (finalSireId && finalDamId && finalSireId === finalDamId) {
      setEditValidationError("O pai e a mãe não podem ser o mesmo animal.");
      return;
    }

    const pedigreeValidation = checkPedigreeIssues(
      editSireId,
      editDamId,
      editingAnimal.species,
      birthYearVal
    );

    if (pedigreeValidation.blockings.length > 0) {
      setEditValidationError(`Inconsistência de Pedigree: ${pedigreeValidation.blockings.join(" | ")}`);
      return;
    }

    if (pedigreeValidation.warnings.length > 0 && !bypassEditPedigreeWarning) {
      setEditValidationError(
        `Aviso de Pedigree: ${pedigreeValidation.warnings.join(" ")} Caso queira salvar a alteração mesmo com pais ausentes (serão considerados fundadores), marque a caixa "Confirmar pedigree com pais ausentes" abaixo e tente salvar novamente.`
      );
      return;
    }

    if (finalSireId) {
      const sireInfo = animals.find(a => a.id === finalSireId);
      if (sireInfo) {
        if (sireInfo.sex !== 'M') {
          setEditValidationError(`Inconsistência (Sexo): O reprodutor informado (${finalSireId}) não é macho.`);
          return;
        }
        if (birthYearVal <= sireInfo.birthYear) {
          setEditValidationError(`Inconsistência Genética: A data de nascimento é igual ou anterior ao pai (${finalSireId}).`);
          return;
        }
      }
    }

    if (finalDamId) {
      const damInfo = animals.find(a => a.id === finalDamId);
      if (damInfo) {
        if (damInfo.sex !== 'F') {
          setEditValidationError(`Inconsistência (Sexo): A matriz informada (${finalDamId}) não é fêmea.`);
          return;
        }
        if (birthYearVal <= damInfo.birthYear) {
          setEditValidationError(`Inconsistência Genética: A data de nascimento é igual ou anterior à mãe (${finalDamId}).`);
          return;
        }
      }
    }

    // Checking progeny roles contradicts new sex settings
    const usedAsSire = animals.some(a => a.sireId === finalId);
    const usedAsDam = animals.some(a => a.damId === finalId);

    if (editSex === 'F' && usedAsSire) {
       setEditValidationError(`Inconsistência Bissexual: O registro ${finalId} já é pai de outro animal e não pode ser alterado para fêmea.`);
       return;
    }
    if (editSex === 'M' && usedAsDam) {
       setEditValidationError(`Inconsistência Bissexual: O registro ${finalId} já é mãe de outro animal e não pode ser alterado para macho.`);
       return;
    }

    // Build Breed Composition
    const breedComp: { [key: string]: number } = {};
    const eb1 = editBreed1.trim();
    const eb2 = editBreed2.trim();
    const eb3 = editBreed3.trim();
    
    let ep1 = editPct1;
    let ep2 = eb2 && editPct2 > 0 ? editPct2 : 0;
    let ep3 = eb3 && editPct3 > 0 ? editPct3 : 0;

    if (!eb1) {
      breedComp['Nelore'] = 1.0;
    } else {
      const totalPct = ep1 + ep2 + ep3;
      if (totalPct > 0) {
        breedComp[eb1] = ep1 / totalPct;
        if (eb2 && ep2 > 0) breedComp[eb2] = ep2 / totalPct;
        if (eb3 && ep3 > 0) breedComp[eb3] = ep3 / totalPct;
      } else {
        breedComp[eb1] = 1.0;
      }
    }

    // Build Phenotypes
    const phenotypes: any = { ...editingAnimal.phenotypes };
    phenotypes.pesoNascimento = editPn !== '' ? Number(editPn) : null;
    phenotypes.pesoDesmame = editPd !== '' ? Number(editPd) : null;
    phenotypes.pesoSobreano = editPs !== '' ? Number(editPs) : null;
    phenotypes.pe = editPe !== '' ? Number(editPe) : null;
    phenotypes.aol = editAol !== '' ? Number(editAol) : null;
    phenotypes.egs = editEgs !== '' ? Number(editEgs) : null;
    phenotypes.car = editCar !== '' ? Number(editCar) : null;
    phenotypes.temperamento = editTemperamento !== '' ? Number(editTemperamento) : null;
    phenotypes.resistenciaCarrapato = editResistenciaCarrapato !== '' ? Number(editResistenciaCarrapato) : null;
    phenotypes.stayability = editStayability !== '' ? Number(editStayability) : null;

    if (phenotypes.pesoSobreano && phenotypes.pesoDesmame) {
      phenotypes.gmd = Math.round(((phenotypes.pesoSobreano - phenotypes.pesoDesmame) / 160) * 1000);
    } else {
      delete phenotypes.gmd;
    }

    phenotypes.epmur_E = editScore1;
    phenotypes.epmur_P = editScore2;
    phenotypes.epmur_M = editScore3;

    const updatedAnimal: Animal = {
      ...editingAnimal,
      name: editName,
      sex: editSex,
      birthDate: editBirthDate,
      birthYear: birthYearVal,
      sireId: finalSireId,
      damId: finalDamId,
      breedComp,
      rebanho: editRebanho,
      manejo: editManejo,
      phenotypes
    };

    onUpdateAnimal(finalId, updatedAnimal);
    setEditingAnimal(null);
  };

  // Sire/Dam live validation info
  const liveSire = useMemo(() => {
    const sId = sireId.trim().toUpperCase();
    if (!sId) return null;
    const found = animals.find(a => a.id === sId);
    return {
      id: sId,
      found: !!found,
      animal: found,
      genderCorrect: found ? found.sex === 'M' : true,
      speciesCorrect: found ? found.species === species : true
    };
  }, [sireId, animals, species]);

  const liveDam = useMemo(() => {
    const dId = damId.trim().toUpperCase();
    if (!dId) return null;
    const found = animals.find(a => a.id === dId);
    return {
      id: dId,
      found: !!found,
      animal: found,
      genderCorrect: found ? found.sex === 'F' : true,
      speciesCorrect: found ? found.species === species : true
    };
  }, [damId, animals, species]);

  const liveEditSire = useMemo(() => {
    const sId = editSireId.trim().toUpperCase();
    if (!sId) return null;
    const found = animals.find(a => a.id === sId);
    return {
      id: sId,
      found: !!found,
      animal: found,
      genderCorrect: found ? found.sex === 'M' : true,
      speciesCorrect: found && editingAnimal ? found.species === editingAnimal.species : true
    };
  }, [editSireId, animals, editingAnimal]);

  const liveEditDam = useMemo(() => {
    const dId = editDamId.trim().toUpperCase();
    if (!dId) return null;
    const found = animals.find(a => a.id === dId);
    return {
      id: dId,
      found: !!found,
      animal: found,
      genderCorrect: found ? found.sex === 'F' : true,
      speciesCorrect: found && editingAnimal ? found.species === editingAnimal.species : true
    };
  }, [editDamId, animals, editingAnimal]);

  const checkPedigreeIssues = (
    sireIdVal: string,
    damIdVal: string,
    offspringSpecies: Species,
    offspringBirthYear: number
  ) => {
    const sId = sireIdVal.trim().toUpperCase();
    const dId = damIdVal.trim().toUpperCase();
    const warnings: string[] = [];
    const blockings: string[] = [];

    if (sId) {
      const sire = animals.find(a => a.id === sId);
      if (!sire) {
        warnings.push(`Pai (${sId}) não foi localizado no rebanho.`);
      } else {
        if (sire.sex !== 'M') {
          blockings.push(`Sexo incorreto do reprodutor: o pai (${sId}) está cadastrado como fêmea.`);
        }
        if (sire.species !== offspringSpecies) {
          blockings.push(`Espécie divergente: o pai (${sId}) é ${sire.species}, diferente do filhote (${offspringSpecies}).`);
        }
        if (offspringBirthYear <= sire.birthYear) {
          blockings.push(`Inconsistência cronológica: o ano de nascimento do filhote (${offspringBirthYear}) não pode ser anterior ou igual ao do pai (${sire.birthYear}).`);
        }
      }
    }

    if (dId) {
      const dam = animals.find(a => a.id === dId);
      if (!dam) {
        warnings.push(`Mãe (${dId}) não foi localizada no rebanho.`);
      } else {
        if (dam.sex !== 'F') {
          blockings.push(`Sexo incorreto da matriz: a mãe (${dId}) está cadastrada como macho.`);
        }
        if (dam.species !== offspringSpecies) {
          blockings.push(`Espécie divergente: a mãe (${dId}) é ${dam.species}, diferente do filhote (${offspringSpecies}).`);
        }
        if (offspringBirthYear <= dam.birthYear) {
          blockings.push(`Inconsistência cronológica: o ano de nascimento do filhote (${offspringBirthYear}) não pode ser anterior ou igual ao da mãe (${dam.birthYear}).`);
        }
      }
    }

    return { warnings, blockings };
  };

  const getBiologicalWarning = (val: number | '', trait: string, species: Species) => {
    if (val === '') return null;
    const num = Number(val);
    if (num < 0) return 'Negativo';
    if (trait === 'pn' && num > 80) return 'PN extremo (>80kg)';
    if (trait === 'pd' && num > 400) return 'PD extremo (>400kg)';
    if (trait === 'ps' && num > 1000) return 'PS extremo (>1000kg)';
    if (trait === 'pe' && num > 55) return 'PE extremo (>55cm)';
    if (trait === 'aol' && num > 150) return 'AOL extrema (>150cm²)';
    if (trait === 'egs' && num > 40) return 'EGS extrema (>40mm)';
    if (trait === 'car' && (num < -2.0 || num > 2.0)) return 'CAR extremo (comum entre -1.5 e +1.5)';
    if (trait === 'temperamento' && (num < 1 || num > 5)) return 'Escore deve ser de 1 a 5';
    if (trait === 'resistenciaCarrapato' && (num < 1 || num > 5)) return 'Escore deve ser de 1 a 5';
    if (trait === 'stayability' && (num < 0 || num > 100)) return 'Stayability deve ser de 0% a 100%';
    return null;
  };

  // Morphological Score
  const [score1, setScore1] = useState(3); // C (CPM) or E (EPMUR)
  const [score2, setScore2] = useState(3); // P (CPM) or P (EPMUR)
  const [score3, setScore3] = useState(3); // M (CPM) or M (EPMUR)

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!id.trim() || !name.trim()) return;

    const birthYearVal = parseInt(birthDate.split('-')[0]) || 2023;
    const finalSireId = sireId.trim() ? sireId.toUpperCase().trim() : null;
    const finalDamId = damId.trim() ? damId.toUpperCase().trim() : null;
    const finalId = id.toUpperCase().trim();

    // Validations:
    if (finalSireId && finalDamId && finalSireId === finalDamId) {
      setValidationError("O pai e a mãe não podem ser o mesmo animal.");
      return;
    }

    const pedigreeValidation = checkPedigreeIssues(
      sireId,
      damId,
      species,
      birthYearVal
    );

    if (pedigreeValidation.blockings.length > 0) {
      setValidationError(`Inconsistência de Pedigree: ${pedigreeValidation.blockings.join(" | ")}`);
      return;
    }

    if (pedigreeValidation.warnings.length > 0 && !bypassPedigreeWarning) {
      setValidationError(
        `Aviso de Pedigree: ${pedigreeValidation.warnings.join(" ")} Caso queira registrar este animal mesmo com pais ausentes (serão considerados fundadores), marque a caixa "Confirmar pedigree com pais ausentes" abaixo e tente salvar novamente.`
      );
      return;
    }

    if (finalSireId) {
      const sireInfo = animals.find(a => a.id === finalSireId);
      if (sireInfo) {
        if (sireInfo.sex !== 'M') {
          setValidationError(`Inconsistência (Sexo): O reprodutor informado (${finalSireId}) não é macho.`);
          return;
        }
        if (birthYearVal <= sireInfo.birthYear) {
          setValidationError(`Inconsistência Genética: A data de nascimento é igual ou anterior ao pai (${finalSireId}).`);
          return;
        }
      }
    }

    if (finalDamId) {
      const damInfo = animals.find(a => a.id === finalDamId);
      if (damInfo) {
        if (damInfo.sex !== 'F') {
          setValidationError(`Inconsistência (Sexo): A matriz informada (${finalDamId}) não é fêmea.`);
          return;
        }
        if (birthYearVal <= damInfo.birthYear) {
          setValidationError(`Inconsistência Genética: A data de nascimento é igual ou anterior à mãe (${finalDamId}).`);
          return;
        }
      }
    }

    // Checking its presence as parent across the herd if trying to create an animal that contradicts existing progeny
    const usedAsSire = animals.some(a => a.sireId === finalId);
    const usedAsDam = animals.some(a => a.damId === finalId);

    if (sex === 'F' && usedAsSire) {
       setValidationError(`Inconsistência Bissexual: O registro ${finalId} já é pai de outro animal e não pode ser cadastrado como fêmea.`);
       return;
    }
    if (sex === 'M' && usedAsDam) {
       setValidationError(`Inconsistência Bissexual: O registro ${finalId} já é mãe de outro animal e não pode ser cadastrado como macho.`);
       return;
    }

    // Build Breed Composition
    const breedComp: { [key: string]: number } = {};
    const b1 = breed1.trim();
    const b2 = breed2.trim();
    const b3 = breed3.trim();
    
    let p1 = pct1;
    let p2 = b2 && pct2 > 0 ? pct2 : 0;
    let p3 = b3 && pct3 > 0 ? pct3 : 0;

    if (!b1) {
      breedComp['Nelore'] = 1.0;
    } else {
      const totalPct = p1 + p2 + p3;
      if (totalPct > 0) {
        breedComp[b1] = p1 / totalPct;
        if (b2 && p2 > 0) breedComp[b2] = p2 / totalPct;
        if (b3 && p3 > 0) breedComp[b3] = p3 / totalPct;
      } else {
        breedComp[b1] = 1.0;
      }
    }

    // Build Phenotypes
    const phenotypes: any = {};
    if (pn !== '') phenotypes.pesoNascimento = Number(pn);
    if (pd !== '') phenotypes.pesoDesmame = Number(pd);
    if (ps !== '') phenotypes.pesoSobreano = Number(ps);
    if (pe !== '') phenotypes.pe = Number(pe);
    if (aol !== '') phenotypes.aol = Number(aol);
    if (egs !== '') phenotypes.egs = Number(egs);
    if (car !== '') phenotypes.car = Number(car);
    if (temperamento !== '') phenotypes.temperamento = Number(temperamento);
    if (resistenciaCarrapato !== '') phenotypes.resistenciaCarrapato = Number(resistenciaCarrapato);
    if (stayability !== '') phenotypes.stayability = Number(stayability);

    // GMD calculation: (Weight Yearling - Weight Weaning) / Days (approx 160 days interval)
    if (phenotypes.pesoSobreano && phenotypes.pesoDesmame) {
      phenotypes.gmd = Math.round(((phenotypes.pesoSobreano - phenotypes.pesoDesmame) / 160) * 1000);
    }

    // Morphological CPM/EPMUR allocation
    phenotypes.epmur_E = score1;
    phenotypes.epmur_P = score2;
    phenotypes.epmur_M = score3;
    phenotypes.epmur_U = 3; // Baseline average
    phenotypes.epmur_R = 4; // Baseline average

    const newAnimal: Animal = {
      id: finalId,
      name,
      species,
      sex,
      birthDate,
      birthYear: birthYearVal,
      sireId: finalSireId,
      damId: finalDamId,
      breedComp,
      rebanho,
      manejo,
      phenotypes
    };

    onAddAnimal(newAnimal);

    // Reset Form fields
    setId('');
    setName('');
    setSireId('');
    setDamId('');
    setPn('');
    setPd('');
    setPs('');
    setPe('');
    setAol('');
    setEgs('');
    setCar('');
    setTemperamento('');
    setResistenciaCarrapato('');
    setStayability('');
    setBypassPedigreeWarning(false);
    setShowAddForm(false);
  };

  // Search and Advanced Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSex, setSelectedSex] = useState<'all' | 'M' | 'F'>('all');
  const [selectedBreed, setSelectedBreed] = useState('all');
  const [selectedRebanho, setSelectedRebanho] = useState('all');

  // Dynamically compute list of available breeds
  const availableBreeds = useMemo(() => {
    const breedsSet = new Set<string>();
    animals.forEach(a => {
      Object.keys(a.breedComp || {}).forEach(b => {
        if (b.trim()) breedsSet.add(b.trim());
      });
    });
    return Array.from(breedsSet).sort();
  }, [animals]);

  // Dynamically compute list of available rural properties (rebanhos)
  const availableRebanhos = useMemo(() => {
    const rebanhosSet = new Set<string>();
    animals.forEach(a => {
      if (a.rebanho && a.rebanho.trim()) {
        rebanhosSet.add(a.rebanho.trim());
      }
    });
    return Array.from(rebanhosSet).sort();
  }, [animals]);

  // Real-time summary stats for the active rebanho
  const stats = useMemo(() => {
    let total = animals.length;
    let males = 0;
    let females = 0;
    const breedCounts: Record<string, number> = {};

    animals.forEach(a => {
      if (a.sex === 'M') males++;
      if (a.sex === 'F') females++;
      
      // Breed counts
      Object.keys(a.breedComp || {}).forEach(b => {
        const breedName = b.trim();
        if (breedName) {
          breedCounts[breedName] = (breedCounts[breedName] || 0) + 1;
        }
      });
    });

    return { total, males, females, breedCounts };
  }, [animals]);

  // Compute filtered list of animals
  const filteredAnimals = useMemo(() => {
    return animals.filter(a => {
      // Species filter
      if (selectedSpecies !== 'all' && a.species !== selectedSpecies) return false;
      
      // Sex filter
      if (selectedSex !== 'all' && a.sex !== selectedSex) return false;

      // Breed filter
      if (selectedBreed !== 'all' && !Object.keys(a.breedComp || {}).includes(selectedBreed)) return false;

      // Property/Rebanho filter
      if (selectedRebanho !== 'all' && a.rebanho !== selectedRebanho) return false;

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = a.id.toLowerCase().includes(q);
        const nameMatch = a.name?.toLowerCase().includes(q);
        if (!idMatch && !nameMatch) return false;
      }

      return true;
    });
  }, [animals, selectedSpecies, selectedSex, selectedBreed, selectedRebanho, searchQuery]);

  const renderDidacticModule = () => {
    // Group gcSimAnimals by their GC key
    const groupedGCs: { [key: string]: typeof gcSimAnimals } = {};
    gcSimAnimals.forEach(a => {
      const season = (a.birthMonth >= 10 || a.birthMonth <= 3) ? 'Aguas' : 'Seca';
      const gcKey = `${a.rebanho}_2026_${season}_${a.sex}_${a.manejo}`;
      if (!groupedGCs[gcKey]) groupedGCs[gcKey] = [];
      groupedGCs[gcKey].push(a);
    });

    // Calculate averages and deviations
    const gcStats = Object.keys(groupedGCs).reduce((acc, key) => {
      const list = groupedGCs[key];
      const sum = list.reduce((s, a) => s + a.weight, 0);
      const avg = sum / list.length;
      acc[key] = { avg, list };
      return acc;
    }, {} as { [key: string]: { avg: number, list: typeof gcSimAnimals } });

    // Find the animal with the highest positive deviation
    let highestDevAnimalId = '';
    let maxDev = -999;
    gcSimAnimals.forEach(a => {
      const season = (a.birthMonth >= 10 || a.birthMonth <= 3) ? 'Aguas' : 'Seca';
      const gcKey = `${a.rebanho}_2026_${season}_${a.sex}_${a.manejo}`;
      const avg = gcStats[gcKey]?.avg || 0;
      const dev = a.weight - avg;
      if (dev > maxDev) {
        maxDev = dev;
        highestDevAnimalId = a.id;
      }
    });

    // Heterozigose math
    const sireComp = {
      Nelore: sireBreedPreset === 'nelore_puro' ? 100 : sireBreedPreset === 'angus_puro' ? 0 : sireBreedPreset === 'senepol_puro' ? 0 : sireBreedPreset === 'f1_angus_nelore' ? 50 : sireNelore,
      Angus: sireBreedPreset === 'nelore_puro' ? 0 : sireBreedPreset === 'angus_puro' ? 100 : sireBreedPreset === 'senepol_puro' ? 0 : sireBreedPreset === 'f1_angus_nelore' ? 50 : sireAngus,
      Senepol: sireBreedPreset === 'nelore_puro' ? 0 : sireBreedPreset === 'angus_puro' ? 0 : sireBreedPreset === 'senepol_puro' ? 100 : sireBreedPreset === 'f1_angus_nelore' ? 0 : sireSenepol,
    };

    const damComp = {
      Nelore: damBreedPreset === 'nelore_puro' ? 100 : damBreedPreset === 'angus_puro' ? 0 : damBreedPreset === 'f1_angus_nelore' ? 55 : damBreedPreset === 'f1_senepol_nelore' ? 50 : damNelore,
      Angus: damBreedPreset === 'nelore_puro' ? 0 : damBreedPreset === 'angus_puro' ? 100 : damBreedPreset === 'f1_angus_nelore' ? 45 : damBreedPreset === 'f1_senepol_nelore' ? 0 : damAngus,
      Senepol: damBreedPreset === 'nelore_puro' ? 0 : damBreedPreset === 'angus_puro' ? 0 : damBreedPreset === 'f1_angus_nelore' ? 0 : damBreedPreset === 'f1_senepol_nelore' ? 50 : damSenepol,
    };

    const sumSire = (sireComp.Nelore + sireComp.Angus + sireComp.Senepol) || 100;
    const sN = sireComp.Nelore / sumSire;
    const sA = sireComp.Angus / sumSire;
    const sS = sireComp.Senepol / sumSire;

    const sumDam = (damComp.Nelore + damComp.Angus + damComp.Senepol) || 100;
    const dN = damComp.Nelore / sumDam;
    const dA = damComp.Angus / sumDam;
    const dS = damComp.Senepol / sumDam;

    const pN = (sN + dN) / 2;
    const pA = (sA + dA) / 2;
    const pS_breed = (sS + dS) / 2;

    const breedOverlap = (sN * dN) + (sA * dA) + (sS * dS);
    const calculatedH = Math.max(0, Math.min(1.0, 1.0 - breedOverlap));

    const weightGain = calculatedH * 22.5;
    const sexualPrecocidade = calculatedH * 12;
    const survivalRate = calculatedH * 8.5;

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Banner Didático Geral */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <BookOpen className="w-48 h-48 text-indigo-700" />
          </div>
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="space-y-2 max-w-3xl">
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} /> Estudo Científico Quantitativo
              </span>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Laboratório Virtual: Grupo de Contemporâneos & Heterozigose</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bem-vindo ao módulo acadêmico de simulação! Aqui você entenderá como remover a "mascara do ambiente" usando a padronização contemporânea (GC) e como maximizar o vigor híbrido através do choque sanguíneo controlado.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/50 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" /> Teoria Aplicada
              </span>
            </div>
          </div>
        </div>

        {/* MÓDULO 1: GRUPO DE CONTEMPORÂNEOS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
          {/* Explanation panel (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3">
              <div className="flex items-center gap-2 text-emerald-750">
                <Award className="w-5 h-5 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Formação de GCs</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                O <strong>Grupo de Contemporâneos (GC)</strong> reúne animais de mesmo sexo, criados na mesma fazenda, sob a mesma estação de nascimento e manejo alimentar.
              </p>
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[10.5px] text-indigo-950 font-medium leading-relaxed">
                <strong>Fórmula de Comparação:</strong><br />
                <span className="font-mono text-xs block text-indigo-800 py-1 font-bold">Desvio = P_individual - Média_GC</span>
                Isso revela se o animal é superior ao seu meio físico, isolando a herdabilidade real.
              </div>
              <p className="text-[10px] text-slate-400 italic leading-tight">
                💡 Altere o mês de nascimento, o manejo ou o sexo de qualquer bezerro ao lado para ver como ele "viaja" para um novo lote no curral em tempo real!
              </p>
            </div>
          </div>

          {/* Interactive simulator (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <span>Painel de Manejo e Curral Virtual</span>
              <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">6 Animais Ativos</span>
            </h4>

            {/* List of editable calves */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gcSimAnimals.map((a, idx) => {
                const season = (a.birthMonth >= 10 || a.birthMonth <= 3) ? 'Aguas' : 'Seca';
                const gcKey = `${a.rebanho}_2026_${season}_${a.sex}_${a.manejo}`;
                const avg = gcStats[gcKey]?.avg || 0;
                const dev = a.weight - avg;
                const isBest = a.id === highestDevAnimalId;

                return (
                  <div key={a.id} className={`p-3 bg-white rounded-xl border transition-all ${isBest ? 'border-emerald-400 shadow-xs ring-2 ring-emerald-400/10' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-mono font-black text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">{a.id}</span>
                        <span className="text-xs font-bold text-slate-800">{a.name}</span>
                      </div>
                      {isBest && (
                        <span className="text-[8px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                          👑 Melhor Desvio
                        </span>
                      )}
                    </div>

                    {/* Editable fields row */}
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block">Nasc (Mês)</label>
                        <select
                          value={a.birthMonth}
                          onChange={(e) => {
                            const updated = [...gcSimAnimals];
                            updated[idx].birthMonth = parseInt(e.target.value);
                            setGcSimAnimals(updated);
                          }}
                          className="w-full text-[10px] border border-gray-200 rounded p-0.5 font-medium cursor-pointer"
                        >
                          <option value={10}>Out (Águas)</option>
                          <option value={11}>Nov (Águas)</option>
                          <option value={5}>Maio (Seca)</option>
                          <option value={6}>Junh (Seca)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block">Sexo</label>
                        <select
                          value={a.sex}
                          onChange={(e) => {
                            const updated = [...gcSimAnimals];
                            updated[idx].sex = e.target.value;
                            setGcSimAnimals(updated);
                          }}
                          className="w-full text-[10px] border border-gray-200 rounded p-0.5 font-medium cursor-pointer"
                        >
                          <option value="M">Macho</option>
                          <option value="F">Fêmea</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block">Alimentação</label>
                        <select
                          value={a.manejo}
                          onChange={(e) => {
                            const updated = [...gcSimAnimals];
                            updated[idx].manejo = e.target.value;
                            setGcSimAnimals(updated);
                          }}
                          className="w-full text-[10px] border border-gray-200 rounded p-0.5 font-medium cursor-pointer"
                        >
                          <option value="Pasto">Pasto</option>
                          <option value="Confinado">Confinado</option>
                        </select>
                      </div>
                    </div>

                    {/* Weight slider & calculated deviation */}
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-50">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Peso Desmame: <strong className="text-slate-800">{a.weight} kg</strong></span>
                        <span className={`font-mono font-bold ${dev >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {dev >= 0 ? `+${dev.toFixed(1)}` : dev.toFixed(1)} kg desvio
                        </span>
                      </div>
                      <input
                        type="range"
                        min={120}
                        max={300}
                        value={a.weight}
                        onChange={(e) => {
                          const updated = [...gcSimAnimals];
                          updated[idx].weight = parseInt(e.target.value);
                          setGcSimAnimals(updated);
                        }}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Contemporary Groups virtual paddocks visualization */}
            <div className="pt-4 border-t border-slate-100">
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Piquetes Virtuais do Curral (Separação por GC)</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.keys(groupedGCs).map(gcKey => {
                  const stat = gcStats[gcKey];
                  const seasonName = gcKey.includes('Aguas') ? 'Águas 🌧️' : 'Seca ☀️';
                  const sexName = gcKey.includes('_M_') ? 'Machos 🐂' : 'Fêmeas 🐄';
                  const feedName = gcKey.includes('Confinado') ? 'Confinamento 🌾' : 'A Pasto 🌿';
                  return (
                    <div key={gcKey} className="bg-emerald-50/40 border border-emerald-500/10 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-wide leading-tight border-b border-emerald-500/10 pb-1 mb-2">
                          {seasonName} • {sexName} • {feedName}
                        </div>
                        <div className="space-y-1">
                          {stat.list.map(anim => {
                            const dev = anim.weight - stat.avg;
                            return (
                              <div key={anim.id} className="flex justify-between items-center text-[10px] bg-white border border-slate-100 px-1.5 py-0.5 rounded shadow-3xs">
                                <span className="font-bold text-slate-700">{anim.id}</span>
                                <span className="text-slate-500">{anim.weight}kg</span>
                                <span className={`font-mono text-[9px] font-black ${dev >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {dev >= 0 ? `+${dev.toFixed(0)}` : dev.toFixed(0)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-dashed border-emerald-500/15 flex justify-between items-center text-[10px] font-bold text-slate-600">
                        <span>Média GC:</span>
                        <span className="text-indigo-700 font-mono">{stat.avg.toFixed(1)} kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* MÓDULO 2: CRUZAMENTO E HETEROZIGOSE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
          {/* Explanation panel (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Dna className="w-5 h-5 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Choque de Sangue</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                A <strong>Heterozigose Individual (H)</strong> quantifica o grau de vigor híbrido (fração de locos heterozigotos) obtido na cria. Ela é inversamente proporcional à coincidência de raças entre o pai e a mãe.
              </p>
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[10.5px] text-indigo-950 font-medium leading-relaxed">
                <strong>Equação de Overlap Racial:</strong><br />
                <span className="font-mono text-xs block text-indigo-800 py-1 font-bold">H = 1 - Σ (P_sire × P_dam)</span>
                Onde P_sire e P_dam representam as proporções da raça "i" no pai e na mãe, respectivamente.
              </div>
              <div className="space-y-1.5 bg-emerald-50/50 p-2.5 rounded-lg text-[10px] text-emerald-900 border border-emerald-100">
                <strong className="block text-[11px]">Efeitos do Vigor Híbrido:</strong>
                <div>• Máxima expressão (100%) no cruzamento F1 (Nelore x Angus puro).</div>
                <div>• Perda de 50% de heterose na segunda geração (F2) se cruzado F1 com F1.</div>
              </div>
            </div>
          </div>

          {/* Crossbreeding Sandbox (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>{viewMode === 'academic' ? 'Laboratório de Cruzamento & Heterose' : 'Laboratório de Cruzamento Genético & Heterose'}</span>
              {viewMode === 'academic' && (
                <span className="text-[9px] lowercase font-normal text-slate-400 font-mono tracking-normal normal-case">
                  Ref: Dickerson (1973), Gregory & Cundiff (1980)
                </span>
              )}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sire selection */}
              <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-50 pb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">REPRODUTOR (Sire - Pai)</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Preset Racial do Pai</label>
                  <select
                    value={sireBreedPreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSireBreedPreset(val);
                      if (val === 'nelore_puro') { setSireNelore(100); setSireAngus(0); setSireSenepol(0); }
                      else if (val === 'angus_puro') { setSireNelore(0); setSireAngus(100); setSireSenepol(0); }
                      else if (val === 'senepol_puro') { setSireNelore(0); setSireAngus(0); setSireSenepol(100); }
                      else if (val === 'f1_angus_nelore') { setSireNelore(50); setSireAngus(50); setSireSenepol(0); }
                    }}
                    className="w-full text-xs border border-gray-200 rounded p-1.5 bg-white text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="nelore_puro">Nelore Puro (100%)</option>
                    <option value="angus_puro">Angus Puro (100%)</option>
                    <option value="senepol_puro">Senepol Puro (100%)</option>
                    <option value="f1_angus_nelore">F1 Angus x Nelore (50/50)</option>
                    <option value="custom">Composição Customizada ⚙️</option>
                  </select>
                </div>

                {sireBreedPreset === 'custom' && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Nelore (%):</span>
                        <span>{sireNelore}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={sireNelore}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSireNelore(val);
                          const rem = 100 - val;
                          setSireAngus(Math.round(rem / 2));
                          setSireSenepol(rem - Math.round(rem / 2));
                        }}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Angus (%):</span>
                        <span>{sireAngus}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={sireAngus}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSireAngus(val);
                          const rem = 100 - val;
                          setSireNelore(Math.round(rem / 2));
                          setSireSenepol(rem - Math.round(rem / 2));
                        }}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                )}

                {/* Display composition tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Nelore: {(sN * 100).toFixed(0)}%</span>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Angus: {(sA * 100).toFixed(0)}%</span>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Senepol: {(sS * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Dam selection */}
              <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-50 pb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">MATRIZ (Dam - Mãe)</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Preset Racial da Mãe</label>
                  <select
                    value={damBreedPreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDamBreedPreset(val);
                      if (val === 'nelore_puro') { setDamNelore(100); setDamAngus(0); setDamSenepol(0); }
                      else if (val === 'angus_puro') { setDamNelore(0); setDamAngus(100); setDamSenepol(0); }
                      else if (val === 'f1_angus_nelore') { setDamNelore(50); setDamAngus(50); setDamSenepol(0); }
                      else if (val === 'f1_senepol_nelore') { setDamNelore(50); setDamAngus(0); setDamSenepol(50); }
                    }}
                    className="w-full text-xs border border-gray-200 rounded p-1.5 bg-white text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="nelore_puro">Nelore Puro (100%)</option>
                    <option value="angus_puro">Angus Puro (100%)</option>
                    <option value="f1_angus_nelore">F1 Angus x Nelore (50/50)</option>
                    <option value="f1_senepol_nelore">F1 Senepol x Nelore (50/50)</option>
                    <option value="custom">Composição Customizada ⚙️</option>
                  </select>
                </div>

                {damBreedPreset === 'custom' && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Nelore (%):</span>
                        <span>{damNelore}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={damNelore}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setDamNelore(val);
                          const rem = 100 - val;
                          setDamAngus(Math.round(rem / 2));
                          setDamSenepol(rem - Math.round(rem / 2));
                        }}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Angus (%):</span>
                        <span>{damAngus}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={damAngus}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setDamAngus(val);
                          const rem = 100 - val;
                          setDamNelore(Math.round(rem / 2));
                          setDamSenepol(rem - Math.round(rem / 2));
                        }}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                )}

                {/* Display composition tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Nelore: {(dN * 100).toFixed(0)}%</span>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Angus: {(dA * 100).toFixed(0)}%</span>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Senepol: {(dS * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Simulated Progeny results card */}
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">🧬 RESULTADO DA CRIA PROJETADA</span>
                <span className="text-[11px] font-semibold text-slate-400">Geração F1 / Cruzamento</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Visual blood composition */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold block">Composição da Progênie:</span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Nelore:</span>
                      <span className="font-bold text-indigo-300">{(pN * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span>Angus:</span>
                      <span className="font-bold text-indigo-300">{(pA * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span>Senepol:</span>
                      <span className="font-bold text-indigo-300">{(pS_breed * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Heterozygosity percentage visual */}
                <div className="bg-slate-800/80 border border-slate-750 p-4 rounded-xl text-center space-y-1">
                  <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block">HETEROZIGOSE INDIVIDUAL</span>
                  <span className="text-3xl font-black text-emerald-400 font-mono">{(calculatedH * 100).toFixed(0)}%</span>
                  <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${calculatedH * 100}%` }}></div>
                  </div>
                  <span className="text-[8px] text-slate-400 block pt-1">
                    {calculatedH === 1.0 ? '⚡ Retenção Máxima (F1)' : calculatedH > 0.4 ? '🔥 Alto Choque Sanguíneo' : calculatedH > 0 ? '✔️ Retenção Parcial' : '⚠️ Zero Vigor Híbrido (Puro)'}
                  </span>
                </div>

                {/* Estimated vigor benefit values */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold block">Ganhos por Heterose (Estimado):</span>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Vigor ao Desmame:</span>
                      <span className="font-bold text-emerald-400">+{weightGain.toFixed(1)} kg</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Precocidade Sexual:</span>
                      <span className="font-bold text-emerald-400">-{sexualPrecocidade.toFixed(1)}% meses</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Taxa Sobrevivência:</span>
                      <span className="font-bold text-emerald-400">+{survivalRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {viewMode !== 'academic' && (
          /* MÓDULO 3: EQUAÇÃO DO CRIADOR (RESPOSTA À SELEÇÃO) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
            {/* Explanation panel */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3">
                <div className="flex items-center gap-2 text-indigo-700">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Equação do Criador</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  A <strong>Resposta à Seleção (R)</strong>, ou Ganho Genético por geração, é a medida do progresso genético acumulado. Ela depende da Herdabilidade da característica e do Diferencial de Seleção (superioridade dos pais).
                </p>
                <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[10.5px] text-indigo-950 font-medium leading-relaxed space-y-1">
                  <strong>Equações Fundamentais:</strong>
                  <div className="font-mono text-xs text-indigo-800 font-bold">R = h² × DS</div>
                  <div className="font-mono text-xs text-indigo-800 font-bold">R_anual = (h² × DS) / L</div>
                  <p className="text-[9px] text-indigo-950 font-normal mt-1 leading-normal">
                    Onde <strong>DS</strong> é o Diferencial de Seleção e <strong>L</strong> é o Intervalo de Gerações (idade média dos pais na cria).
                  </p>
                </div>
                <div className="space-y-1 bg-amber-50/50 p-2.5 rounded-lg text-[10px] text-amber-900 border border-amber-100/70">
                  <strong>Análise Genética:</strong>
                  <p className="leading-relaxed">
                    Para acelerar o ganho genético anual, o geneticista deve: aumentar a intensidade/DS, focar em características de alta herdabilidade ou <strong>reduzir o Intervalo de Gerações (L)</strong> (ex: usando reprodutores e matrizes mais jovens).
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Calculator */}
            <div className="lg:col-span-8 space-y-6">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center justify-between">
                <span>Simulador de Resposta à Seleção (Melhoramento Genético)</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">Zootecnia Quantitativa</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Presets and Trait select */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Característica Alvo</label>
                    <select
                      value={breedersTrait}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setBreedersTrait(val);
                        if (val === 'pd') {
                          setBreedersH2(0.25);
                          setBreedersSD(30);
                        } else if (val === 'pe') {
                          setBreedersH2(0.40);
                          setBreedersSD(3.5);
                        } else if (val === 'gmd') {
                          setBreedersH2(0.32);
                          setBreedersSD(120);
                        }
                      }}
                      className="w-full text-xs border border-gray-200 rounded p-1.5 bg-white text-slate-700 font-semibold cursor-pointer"
                    >
                      <option value="pd">Peso ao Desmame (PD) - h² = 0.25</option>
                      <option value="pe">Perímetro Escrotal (PE) - h² = 0.40</option>
                      <option value="gmd">Ganho de Peso Médio Diário (GMD) - h² = 0.32</option>
                      <option value="custom">Configuração Customizada ⚙️</option>
                    </select>
                  </div>

                  {/* Heritability Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Herdabilidade (h²):</span>
                      <span className="text-indigo-600 font-mono font-black">{breedersH2.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={0.80}
                      step={0.01}
                      disabled={breedersTrait !== 'custom'}
                      value={breedersH2}
                      onChange={(e) => setBreedersH2(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                    />
                    <p className="text-[8.5px] text-slate-400 leading-none">
                      {breedersH2 <= 0.15 ? 'Características reprodutivas/fertilidade (Baixa herdabilidade)' : breedersH2 <= 0.35 ? 'Características de crescimento (Média herdabilidade)' : 'Características de carcaça (Alta herdabilidade)'}
                    </p>
                  </div>

                  {/* Selection Differential Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Diferencial de Seleção (DS):</span>
                      <span className="text-indigo-600 font-mono font-black">
                        +{breedersSD} {breedersTrait === 'pe' ? 'cm' : breedersTrait === 'gmd' ? 'g/dia' : 'kg'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={breedersTrait === 'pe' ? 1.0 : breedersTrait === 'gmd' ? 20 : 5}
                      max={breedersTrait === 'pe' ? 10.0 : breedersTrait === 'gmd' ? 300 : 80}
                      step={breedersTrait === 'pe' ? 0.1 : breedersTrait === 'gmd' ? 5 : 1}
                      value={breedersSD}
                      onChange={(e) => setBreedersSD(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <p className="text-[8.5px] text-slate-400 leading-none">
                      Representa quão superiores os reprodutores selecionados são em relação ao rebanho base.
                    </p>
                  </div>
                </div>

                {/* Generation Interval and calculations */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                      Intervalo de Gerações (L):
                    </span>
                    
                    {/* Selector for Mode */}
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setBreedersLMode('manual')}
                        className={`py-1 px-1.5 text-[9.5px] font-bold rounded-md transition-all cursor-pointer text-center ${
                          breedersLMode === 'manual'
                            ? 'bg-white text-indigo-700 shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        🎛️ Opção 1: Régua
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreedersLMode('database')}
                        className={`py-1 px-1.5 text-[9.5px] font-bold rounded-md transition-all cursor-pointer text-center ${
                          breedersLMode === 'database'
                            ? 'bg-white text-indigo-700 shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        💾 Opção 2: BD
                      </button>
                    </div>

                    {breedersLMode === 'manual' ? (
                      <div className="space-y-2 pt-0.5 animate-fade-in">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Régua Manual (L):</span>
                          <span className="text-indigo-600 font-mono font-black">{breedersL.toFixed(1)} anos</span>
                        </div>
                        <input
                          type="range"
                          min={2.0}
                          max={10.0}
                          step={0.5}
                          value={breedersL}
                          onChange={(e) => setBreedersL(parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <p className="text-[8.5px] text-slate-400 leading-tight">
                          Média de idade de touros e matrizes no nascimento das crias de reposição. Menor L = maior progresso genético anual!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-0.5 animate-fade-in text-[11px]">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>L Calculado (BD):</span>
                          {databaseL !== null ? (
                            <span className="text-emerald-600 font-mono font-black">{databaseL.toFixed(1)} anos</span>
                          ) : (
                            <span className="text-amber-600 font-bold text-[9px]">Incalculável (s/ dados)</span>
                          )}
                        </div>
                        
                        {databaseL !== null ? (
                          <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg space-y-1">
                            <span className="text-[9.5px] font-extrabold uppercase text-emerald-800 block tracking-wider">Detalhamento Técnico</span>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-slate-650">
                              <span>Pares analisados:</span>
                              <span className="font-mono font-bold text-slate-800 text-right">{databaseStats.totalPairs}</span>
                              <span>Média Idade Pais:</span>
                              <span className="font-mono font-bold text-slate-800 text-right">{databaseStats.avgSireAge !== null ? `${databaseStats.avgSireAge.toFixed(1)}a` : '-'}</span>
                              <span>Média Idade Mães:</span>
                              <span className="font-mono font-bold text-slate-800 text-right">{databaseStats.avgDamAge !== null ? `${databaseStats.avgDamAge.toFixed(1)}a` : '-'}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-lg space-y-1 text-amber-900 leading-normal text-[9.5px]">
                            <div className="font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Faltam dados de filiação</span>
                            </div>
                            <p className="text-[8.5px] text-slate-500">
                              Nenhum animal possui Pai/Mãe cadastrados que também estejam na tabela de animais do app para o cálculo automático do intervalo de gerações.
                            </p>
                            <p className="text-[8.5px] text-slate-500 font-semibold">
                              Usando padrão: <strong>5.5 anos</strong>.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mathematical Calculation Result visual */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Ganho por Geração (R):</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {(breedersH2 * breedersSD).toFixed(2)} {breedersTrait === 'pe' ? 'cm' : breedersTrait === 'gmd' ? 'g/dia' : 'kg'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 border-t border-slate-200/50 pt-1 mt-1">
                      <span>Fórmula:</span>
                      <span className="font-mono text-[10px] text-indigo-700">
                        {breedersH2.toFixed(2)} x {breedersSD}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results visual dashboard */}
              <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">📊 GANHO GENÉTICO ANUAL ESTIMADO (Ra)</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">R_anual = R / L</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="text-center md:text-left space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Progresso Genético Anual:</p>
                    <div className="flex items-baseline justify-center md:justify-start gap-1">
                      <span className="text-4xl font-black text-emerald-400 font-mono">
                        {((breedersH2 * breedersSD) / activeL).toFixed(3)}
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        {breedersTrait === 'pe' ? 'cm/ano' : breedersTrait === 'gmd' ? 'g/dia por ano' : 'kg/ano'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight">
                      Em 10 anos de seleção contínua, o peso médio de desmame do rebanho aumentará cerca de{' '}
                      <strong className="text-emerald-300 font-mono">
                        {(((breedersH2 * breedersSD) / activeL) * 10).toFixed(1)}{' '}
                        {breedersTrait === 'pe' ? 'cm' : breedersTrait === 'gmd' ? 'g/dia' : 'kg'}
                      </strong>
                      !
                    </p>
                  </div>

                  {/* Educational analysis text */}
                  <div className="p-3 bg-slate-850 rounded-lg border border-slate-750 text-[10px] text-slate-300 leading-relaxed space-y-1">
                    <strong className="text-indigo-300 block text-[11px]">Insights de Zootecnia:</strong>
                    <div>
                      {activeL > 6 ? (
                        <span className="text-rose-300 font-semibold">⚠️ Intervalo de geração longo ({activeL.toFixed(1)} anos) está atrasando seu progresso. Considere descartar touros velhos mais cedo.</span>
                      ) : (
                        <span className="text-emerald-300 font-semibold">✔️ Excelente! O intervalo de geração de {activeL.toFixed(1)} anos permite um ganho genético rápido e dinâmico.</span>
                      )}
                    </div>
                    <div>
                      {breedersH2 < 0.2 ? (
                        <span>Como a herdabilidade é baixa, invista também em nutrição e ambiente, pois a seleção genética individual é mais lenta.</span>
                      ) : (
                        <span>Com herdabilidade de {breedersH2}, a resposta ao melhoramento é alta! O foco em reprodutores provados trará retornos rápidos.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
)}

        {/* MÓDULO 4: PARÂMETROS GENÉTICOS & DECOMPOSIÇÃO DE VARIÂNCIAS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
          {/* Explanation panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-700">
                <Dna className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Parâmetros & Variâncias</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                A variação total observada no campo é chamada de <strong>Variância Fenotípica (Vp)</strong>. No melhoramento, nós a dividimos em duas frações fundamentais para calcular a herdabilidade:
              </p>
              
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-[10.5px] text-indigo-950 font-medium space-y-2">
                <strong>Decomposição Clássica:</strong>
                <div className="font-mono text-xs text-indigo-800 font-bold block bg-white px-2 py-1 rounded border border-indigo-150 text-center">
                  Vp = Vg + Ve
                </div>
                <p className="text-[9px] text-slate-500 font-normal leading-relaxed">
                  • <strong>Vg (Genética Aditiva):</strong> Parte herdável transmitida à progênie.<br />
                  • <strong>Ve (Ambiental):</strong> Ruído do manejo, clima e nutrição.
                </p>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-[10.5px] text-emerald-950 font-medium space-y-1.5">
                <strong>Herdabilidade no Sentido Restrito (h²):</strong>
                <div className="font-mono text-xs text-emerald-800 font-bold block bg-white px-2 py-1 rounded border border-emerald-150 text-center">
                  h² = Vg / Vp
                </div>
                <p className="text-[9px] text-slate-500 font-normal leading-relaxed">
                  Representa a fração da variância fenotípica total que se deve à ação aditiva dos genes. É o parâmetro genético central!
                </p>
              </div>

              <div className="space-y-1 bg-amber-50/50 p-2.5 rounded-lg text-[10px] text-amber-900 border border-amber-100/70">
                <strong className="block text-[11px] text-amber-950">💡 O Efeito do Grupo de Contemporâneos:</strong>
                <p className="leading-relaxed">
                  Quando você cria <strong>Grupos de Contemporâneos (GCs)</strong> bem estruturados (Módulo 1), você remove as diferenças ambientais sistemáticas entre os bezerros. Isso reduz drasticamente a Variância Ambiental (Ve), elevando a herdabilidade real!
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Variances Sandbox */}
          <div className="lg:col-span-8 space-y-6">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center justify-between">
              <span>Decomposição Dinâmica de Variâncias (Modelo Quantitativo)</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">Parâmetros Genéticos</span>
            </h4>

            {/* Trait Presets Tabs */}
            <div className="flex flex-wrap gap-2 bg-white p-2.5 rounded-xl border border-slate-150">
              <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center mr-2">Estudar Característica:</span>
              <button
                type="button"
                onClick={() => {
                  setVarianceTraitPreset('reprodutivo');
                  setVarianceVg(15);
                  setVarianceVe(285);
                }}
                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all border ${
                  varianceTraitPreset === 'reprodutivo'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                }`}
              >
                🥚 Fertilidade (h² = 5%)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVarianceTraitPreset('crescimento');
                  setVarianceVg(120);
                  setVarianceVe(360);
                }}
                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all border ${
                  varianceTraitPreset === 'crescimento'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                }`}
              >
                🥩 Peso Desmame (h² = 25%)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVarianceTraitPreset('carcaca');
                  setVarianceVg(220);
                  setVarianceVe(220);
                }}
                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all border ${
                  varianceTraitPreset === 'carcaca'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                }`}
              >
                📐 Olho de Lombo / Carcaça (h² = 50%)
              </button>
              <button
                type="button"
                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all border ${
                  varianceTraitPreset === 'custom'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-400 border-slate-100'
                }`}
                disabled
              >
                ✏️ Customizado ({((varianceVg / (varianceVg + varianceVe)) * 100).toFixed(0)}%)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sliders Box */}
              <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-4">
                {/* Vg Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      Variância Genética Aditiva (Vg):
                    </span>
                    <span className="font-mono text-indigo-600 font-black">{varianceVg} kg²</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={600}
                    step={10}
                    value={varianceVg}
                    onChange={(e) => {
                      setVarianceVg(parseInt(e.target.value));
                      setVarianceTraitPreset('custom');
                    }}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[8.5px] text-slate-400">
                    Diferenças genéticas individuais herdáveis entre os animais.
                  </p>
                </div>

                {/* Ve Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Variância Ambiental (Ve):
                    </span>
                    <span className="font-mono text-amber-600 font-black">{varianceVe} kg²</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={1000}
                    step={10}
                    value={varianceVe}
                    onChange={(e) => {
                      setVarianceVe(parseInt(e.target.value));
                      setVarianceTraitPreset('custom');
                    }}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <p className="text-[8.5px] text-slate-400">
                    Ruído externo, nutrição heterogênea, diferenças sanitárias e de clima.
                  </p>
                </div>

                {/* Standardize buttons (GC manipulation) */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Ações Práticas de Manejo:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVarianceVe(Math.max(20, Math.round(varianceVe * 0.70)));
                        setVarianceTraitPreset('custom');
                      }}
                      className="px-2.5 py-1.5 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 rounded-lg transition"
                      title="Padronizar o ambiente cria lotes uniformes (Contemporary Groups), diminuindo Ve e elevando h²."
                    >
                      🌱 Padronizar Lote (Ve -30%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVarianceVe(Math.min(1000, Math.round(varianceVe * 1.30)));
                        setVarianceTraitPreset('custom');
                      }}
                      className="px-2.5 py-1.5 text-[9.5px] font-bold text-amber-700 bg-amber-50/50 hover:bg-amber-100/50 border border-amber-200/50 rounded-lg transition"
                      title="Clima adverso ou nutrição desigual aumentam Ve, abafando o sinal genético real."
                    >
                      🌪️ Clima Desfavorável (Ve +30%)
                    </button>
                  </div>
                </div>
              </div>

              {/* Composition Visual Chart */}
              <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Composição da Variância Fenotípica Total (Vp)</span>
                  
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[11px] text-slate-700">
                    <div className="flex justify-between">
                      <span>Vg (Genética):</span>
                      <span className="font-bold text-indigo-700">{varianceVg} kg² ({((varianceVg / (varianceVg + varianceVe)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ve (Ambiental):</span>
                      <span className="font-bold text-amber-700">{varianceVe} kg² ({((varianceVe / (varianceVg + varianceVe)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold">
                      <span>Vp (Fenotípica Total):</span>
                      <span className="text-slate-900">{varianceVg + varianceVe} kg²</span>
                    </div>
                  </div>

                  {/* Composition Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-extrabold text-slate-400">
                      <span>GENÉTICA (Vg)</span>
                      <span>AMBIENTE (Ve)</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full flex overflow-hidden border border-slate-200">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
                        style={{ width: `${(varianceVg / (varianceVg + varianceVe)) * 100}%` }}
                        title={`Genética: ${((varianceVg / (varianceVg + varianceVe)) * 100).toFixed(1)}%`}
                      ></div>
                      <div
                        className="bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
                        style={{ width: `${(varianceVe / (varianceVg + varianceVe)) * 100}%` }}
                        title={`Ambiente: ${((varianceVe / (varianceVg + varianceVe)) * 100).toFixed(1)}%`}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-indigo-50 border border-indigo-100/50 rounded-lg text-[10px] text-indigo-950 font-semibold text-center leading-tight">
                  🧬 h² calculada para esta característica: <strong className="text-indigo-700 font-mono text-[11px]">{(varianceVg / (varianceVg + varianceVe)).toFixed(3)}</strong>
                </div>
              </div>
            </div>

            {/* Estudos de Caso Didáticos */}
            <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3">
              <div className="flex items-center gap-1.5 text-slate-700">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estudos de Caso de Tomada de Decisão:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setVarianceTraitPreset('custom');
                    setVarianceVg(120);
                    setVarianceVe(750); // High Ve
                  }}
                  className="p-2.5 text-left rounded-lg bg-red-50/50 hover:bg-red-50 border border-red-100 transition space-y-1 group"
                >
                  <span className="text-[10.5px] font-bold text-red-950 block">🍂 Pasto Degradado (Ve alto)</span>
                  <p className="text-[9px] text-slate-500 leading-snug">
                    O ruído nutricional infla a variância ambiental (Ve), sufocando a herdabilidade real. Clique para carregar.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVarianceTraitPreset('custom');
                    setVarianceVg(120);
                    setVarianceVe(120); // Low Ve
                  }}
                  className="p-2.5 text-left rounded-lg bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 transition space-y-1 group"
                >
                  <span className="text-[10.5px] font-bold text-emerald-950 block">🌾 Manejo Excelente (Ve baixo)</span>
                  <p className="text-[9px] text-slate-500 leading-snug">
                    A criação de GCs precisos e nutrição homogênea minimizam Ve. Clique para revelar a verdadeira força dos genes.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVarianceTraitPreset('reprodutivo');
                    setVarianceVg(15);
                    setVarianceVe(285);
                  }}
                  className="p-2.5 text-left rounded-lg bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 transition space-y-1 group"
                >
                  <span className="text-[10.5px] font-bold text-indigo-950 block">🧬 Paradoxo da Fertilidade</span>
                  <p className="text-[9px] text-slate-500 leading-snug">
                    Por que características de sobrevivência têm h² muito baixa? Descubra o impacto evolutivo e reprodutivo.
                  </p>
                </button>
              </div>
            </div>

            {/* CALCULADORA DE DEP INDIVIDUAL SIMPLIFICADA */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Scale className="w-5 h-5 text-indigo-400" />
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Calculadora de DEP Individual & Valor Genético</h5>
                  <p className="text-[9px] text-slate-400 leading-tight">Observe como a Herdabilidade (h²) atua como um "filtro" que retira o efeito ambiental do fenótipo do animal.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                {/* Inputs area */}
                <div className="space-y-3.5 bg-slate-950/40 p-3.5 rounded-lg border border-slate-800">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px] text-slate-300">
                      <span>Desempenho do Bezerro (P):</span>
                      <span className="font-mono text-emerald-400 font-bold">{studentAnimalWeight} kg</span>
                    </div>
                    <input
                      type="range"
                      min={150}
                      max={320}
                      step={5}
                      value={studentAnimalWeight}
                      onChange={(e) => setStudentAnimalWeight(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px] text-slate-300">
                      <span>Média do Grupo de Contemporâneos (μ):</span>
                      <span className="font-mono text-indigo-400 font-bold">{studentGroupAverage} kg</span>
                    </div>
                    <input
                      type="range"
                      min={150}
                      max={260}
                      step={5}
                      value={studentGroupAverage}
                      onChange={(e) => setStudentGroupAverage(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                  </div>

                  <div className="text-[9px] text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800">
                    <strong className="text-amber-400 block mb-0.5">💡 Regra de Ouro da Zootecnia:</strong>
                    Nunca selecione animais comparando pesos absolutos de fazendas ou manejos diferentes. O desvio em relação ao Grupo de Contemporâneos (P - μ) é a única base estatística correta!
                  </div>
                </div>

                {/* Mathematical simulation results */}
                {(() => {
                  const h2 = varianceVg / (varianceVg + varianceVe);
                  const deviation = studentAnimalWeight - studentGroupAverage;
                  const ebv = h2 * deviation;
                  const dep = 0.5 * ebv;

                  return (
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cálculo Didático Passo a Passo</span>
                      
                      <div className="space-y-2 text-[10.5px] font-mono leading-relaxed">
                        <div className="flex justify-between items-center bg-slate-850 p-2 rounded border border-slate-800">
                          <span className="text-slate-400">1. Desvio Fenotípico (P - μ):</span>
                          <span className={`font-bold ${deviation >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {deviation >= 0 ? `+${deviation}` : deviation} kg
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-850 p-2 rounded border border-slate-800">
                          <span className="text-slate-400">2. Valor Genético (h² × Desvio):</span>
                          <span className="font-bold text-indigo-300">
                            {(h2 * 100).toFixed(1)}% × {deviation} = {ebv >= 0 ? `+${ebv.toFixed(1)}` : ebv.toFixed(1)} kg
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-indigo-950/40 p-2.5 rounded border border-indigo-800">
                          <span className="text-indigo-200 font-bold">3. DEP Estimada (0.5 × VG):</span>
                          <span className="font-black text-emerald-400 text-sm">
                            {dep >= 0 ? `+${dep.toFixed(2)}` : dep.toFixed(2)} kg
                          </span>
                        </div>
                      </div>

                      <p className="text-[9.5px] text-slate-300 leading-normal bg-indigo-900/20 p-2.5 rounded border border-indigo-950/30">
                        {dep >= 0 ? (
                          <span>
                            Este bezerro transmitirá, em média, <strong className="text-emerald-300 font-mono">+{dep.toFixed(2)} kg</strong> de ganho de peso genético direto à sua progênie, caso seja utilizado como reprodutor!
                          </span>
                        ) : (
                          <span>
                            Este bezerro tem DEP negativa de <strong className="text-rose-300 font-mono">{dep.toFixed(2)} kg</strong>. Ele tende a produzir progênies mais leves do que a média dos contemporâneos.
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Results Board: Recommendation dashboard */}
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">📈 DIAGNÓSTICO DO PARÂMETRO GENÉTICO</span>
                <span className="text-[10px] text-slate-400 font-mono">h² = Vg / (Vg + Ve)</span>
              </div>

              {(() => {
                const h2 = varianceVg / (varianceVg + varianceVe);
                let classification = '';
                let recommendation = '';
                let colorClass = '';

                if (h2 < 0.15) {
                  classification = 'BAIXA HERDABILIDADE';
                  colorClass = 'text-rose-400';
                  recommendation = 'A seleção fenotípica direta trará progresso genético muito lento. Recomenda-se priorizar o melhoramento do ambiente (nutrição de creep-feeding, sanidade do pasto, abrigo) ou empregar o cruzamento industrial de raças para aproveitar ao máximo a heterose (vigor híbrido) no ganho de peso.';
                } else if (h2 <= 0.35) {
                  classification = 'MÉDIA HERDABILIDADE';
                  colorClass = 'text-indigo-300';
                  recommendation = 'Resposta intermediária à seleção. É fundamental utilizar Diferenciais de Seleção robustos e padronizar o rebanho em Grupos de Contemporâneos precisos. A seleção individual deve ser auxiliada por avaliações genéticas de parentes (BLUP) e DEPs para maior confiabilidade.';
                } else {
                  classification = 'ALTA HERDABILIDADE';
                  colorClass = 'text-emerald-400';
                  recommendation = 'Excelente resposta à seleção! Os animais que se destacam fenotipicamente no campo realmente possuem genes superiores. O progresso genético será rápido através da seleção massal direta. Invista em reprodutores de elite provados para maximizar o ganho genético!';
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="text-center md:border-r md:border-slate-800 pr-4 space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Classificação de h²:</span>
                      <span className={`text-sm font-black tracking-tight block ${colorClass}`}>{classification}</span>
                      <span className="text-4xl font-black text-white font-mono block">{(h2 * 100).toFixed(0)}%</span>
                      <span className="text-[8.5px] text-slate-500 leading-none block pt-0.5">da variação do rebanho se deve à genética aditiva</span>
                    </div>

                    <div className="md:col-span-2 space-y-1.5 text-[10.5px] text-slate-300 leading-relaxed">
                      <strong className="text-indigo-300 font-black uppercase tracking-wider block text-[11px]">Recomendação Estratégica (Zootecnia):</strong>
                      <p>{recommendation}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* MÓDULO 5: DESAFIO DE FIXAÇÃO (QUIZ ZOOTÉCNICO) */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 border border-indigo-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-indigo-800 pb-4">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600/20 p-2 rounded-xl border border-indigo-500/20">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-md font-bold tracking-tight">Desafio de Fixação Zootécnica</h3>
                <p className="text-[10px] text-slate-300">Avalie os seus conhecimentos em melhoramento genético e formação de GCs!</p>
              </div>
            </div>
            {quizSubmitted && (
              <button
                onClick={() => {
                  setQuizAnswers({});
                  setQuizSubmitted(false);
                }}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition font-bold"
              >
                Refazer Quiz 🔄
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 1,
                q: "1. Se um bezerro F1 (Angus x Nelore) é cruzado de volta com uma matriz Nelore pura (Retrocruzamento), qual é o percentual esperado de Heterozigose Individual (H) na progênie resultante?",
                options: [
                  "100% (Mantém o mesmo vigor híbrido total)",
                  "50% (Redução proporcional devido à coincidência de genes Nelore)",
                  "25% (Apenas herdabilidade materna se mantém)",
                  "0% (Retorna a ser considerado puro por absorção)"
                ],
                correct: 1,
                exp: "No retrocruzamento de um F1 (50% Nelore, 50% Angus) com Nelore puro, o overlap de raças aumenta. A coincidência genética é de (0.5 * 1.0) = 0.5, logo a heterozigose retida é H = 1 - 0.5 = 50%."
              },
              {
                id: 2,
                q: "2. Qual é a consequência direta de se estabelecer critérios excessivamente rígidos e detalhados para a formação de um Grupo de Contemporâneos (GC) no curral?",
                options: [
                  "Aumento da precisão pois os animais serão idênticos.",
                  "Diminuição excessiva do tamanho do GC, reduzindo o poder estatístico da avaliação genética.",
                  "Eliminação total do efeito ambiental no desvio genético.",
                  "Melhoria imediata nas DEPs do rebanho de demonstração."
                ],
                correct: 1,
                exp: "Se você segmentar demais (por exemplo, criando grupos minúsculos por dia exato de nascimento), os GCs terão poucos animais (ou até um só). Isso inviabiliza a comparação estatística e o cálculo preciso da média e do desvio."
              },
              {
                id: 3,
                q: "3. Se uma característica do rebanho apresenta herdabilidade de apenas h² = 0.08, qual a melhor estratégia zootécnica para obter progresso rápido de desempenho?",
                options: [
                  "Focar exclusivamente em seleção individual de reprodutores de elite.",
                  "Melhorar o manejo nutricional/sanitário e utilizar cruzamento industrial (heterose).",
                  "Aumentar o Intervalo de Gerações (L) para dar mais estabilidade aos genes.",
                  "Ignorar a característica, pois características com h² baixa não sofrem influência ambiental."
                ],
                correct: 1,
                exp: "Com h² baixa (0.08), apenas 8% da variação é explicada por efeitos aditivos dos genes. A seleção individual trará ganho genético lentíssimo. O progresso rápido deve vir da melhoria do ambiente (nutrição/manejo) e do cruzamento (aproveitando a alta heterose para características de baixa herdabilidade)."
              },
              {
                id: 4,
                q: "4. Na Equação do Criador, se o Intervalo de Geração (L) for reduzido pela metade, o que acontece com o ganho genético anual?",
                options: [
                  "É reduzido pela metade, pois os pais têm menos tempo para passar seus genes.",
                  "Fica inalterado, pois o progresso acumulado independe do tempo.",
                  "Dobra, pois o ciclo de melhoramento acelera no tempo.",
                  "Aumenta exponencialmente de acordo com a herdabilidade individual."
                ],
                correct: 2,
                exp: "O ganho genético anual é calculado por Ra = R / L. Reduzindo o denominador (L) pela metade, a resposta anual dobra, pois giramos as gerações mais rápido e injetamos genética provada mais cedo no plantel."
              }
            ].map((item, qIdx) => {
              const isSelected = quizAnswers[item.id] !== undefined;
              const userAns = quizAnswers[item.id];
              const isCorrect = userAns === item.correct;

              return (
                <div key={item.id} className="p-4 bg-slate-800/80 border border-slate-750 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 leading-relaxed">{item.q}</h4>
                  <div className="space-y-1.5">
                    {item.options.map((opt, optIdx) => {
                      const isOptionSelected = userAns === optIdx;
                      let btnStyle = "bg-slate-700/50 text-slate-300 hover:bg-slate-700 border-slate-700";
                      
                      if (quizSubmitted) {
                        if (optIdx === item.correct) {
                          btnStyle = "bg-emerald-900/40 text-emerald-300 border-emerald-500 font-bold";
                        } else if (isOptionSelected) {
                          btnStyle = "bg-rose-900/40 text-rose-300 border-rose-500";
                        }
                      } else if (isOptionSelected) {
                        btnStyle = "bg-indigo-600/30 text-indigo-200 border-indigo-500 font-bold";
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={quizSubmitted}
                          onClick={() => {
                            setQuizAnswers(prev => ({ ...prev, [item.id]: optIdx }));
                          }}
                          className={`w-full text-left text-[10.5px] p-2 border rounded-lg transition-all flex items-start gap-2 ${btnStyle}`}
                        >
                          <span className="font-bold shrink-0">{String.fromCharCode(65 + optIdx)})</span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {quizSubmitted && (
                    <div className={`p-2.5 rounded text-[10px] leading-relaxed ${isCorrect ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 'bg-rose-950/40 text-rose-400 border border-rose-900/50'}`}>
                      <strong className="block mb-0.5">{isCorrect ? '🎉 Correto!' : '❌ Incorreto! Resposta correta: ' + String.fromCharCode(65 + item.correct)}</strong>
                      <p className="text-slate-300">{item.exp}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!quizSubmitted && (
            <div className="flex justify-end pt-2">
              <button
                disabled={Object.keys(quizAnswers).length < 4}
                onClick={() => setQuizSubmitted(true)}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl uppercase tracking-wider transition cursor-pointer"
              >
                Corrigir Respostas 📝
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header section with species filter & add btn */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <Ruler className="w-5 h-5 text-indigo-600" />
            Coleta e Cadastro de Campo
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Gerencie o rebanho ativo, insira pesagens ou escores CPM/EPMUR e visualize o Grupo de Contemporâneos (GC) automático.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={onResetData}
            title="Redefine o banco de dados do plantel para os valores de demonstração originais, descartando mudanças locais."
            className="p-2 border border-gray-100 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-indigo-600 transition shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownloadTemplate}
            title="Baixar Modelo Excel (.xlsx): Baixa a planilha padrão com as colunas corretas para preenchimento de dados de campo em massa."
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-lg text-xs font-semibold tracking-tight transition cursor-pointer shrink-0"
            id="btn-download-template"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden md:inline">Baixar Modelo Excel</span>
            <span className="md:hidden">Modelo XLSX</span>
          </button>

          <label
            title="Importar Planilha: Selecione uma planilha Excel (.xlsx) preenchida conforme o modelo padrão para importar múltiplos animais e suas medições de uma só vez."
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold tracking-tight transition cursor-pointer shrink-0"
            id="label-upload-excel"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Planilha</span>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleUploadExcel}
              className="hidden"
            />
          </label>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            title="Cadastrar Registro: Abre o formulário de cadastro manual para inclusão de novo animal com pedigree e fenotipagem no sistema."
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold tracking-tight transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Cancelar' : 'Cadastrar Registro'}</span>
          </button>
        </div>
      </div>

      {/* Academic Sub-tab switch (if viewMode === 'academic') */}
      {viewMode === 'academic' && (
        <div className="flex border-b border-slate-100 mb-6 gap-2">
          <button
            onClick={() => setAcademicSubTab('didactic')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              academicSubTab === 'didactic'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Laboratório Didático (Simulação GC & Heterozigose)
          </button>
          <button
            onClick={() => setAcademicSubTab('traditional')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              academicSubTab === 'traditional'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            Coleta Tradicional e Cadastro de Campo
          </button>
        </div>
      )}

      {viewMode === 'academic' && academicSubTab === 'didactic' ? (
        renderDidacticModule()
      ) : (
        <>

      {/* Real-time Summary Stats Panel (Sexo e Raça) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between shadow-3xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total do Plantel</span>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              REAL-TIME
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 font-mono">{stats.total}</span>
            <span className="text-xs text-slate-500">animais registrados</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between shadow-3xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribuição por Sexo</span>
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold text-indigo-600">Macho/Fêmea</span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Machos:
              </span>
              <span className="font-bold text-slate-800 font-mono">{stats.males} <span className="text-[10px] font-normal text-slate-400">({stats.total > 0 ? ((stats.males / stats.total) * 100).toFixed(0) : 0}%)</span></span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-500"></span> Fêmeas:
              </span>
              <span className="font-bold text-slate-800 font-mono">{stats.females} <span className="text-[10px] font-normal text-slate-400">({stats.total > 0 ? ((stats.females / stats.total) * 100).toFixed(0) : 0}%)</span></span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between shadow-3xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Contagem por Raça</span>
          <div className="flex flex-wrap gap-1.5 max-h-[50px] overflow-y-auto pr-1">
            {Object.entries(stats.breedCounts).map(([breed, count]) => (
              <span key={breed} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 font-medium font-mono">
                <span className="text-indigo-600 font-bold">{breed}:</span> {count}
              </span>
            ))}
            {Object.keys(stats.breedCounts).length === 0 && (
              <span className="text-xs text-slate-400 italic">Sem raças registradas</span>
            )}
          </div>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleFormSubmit} className="bg-gray-50/55 border border-indigo-100 rounded-xl p-5 mb-8 space-y-4">
          <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider border-b border-indigo-100/50 pb-2">
            Ficha de Inscrição e Fenotipagem
          </h3>

          {validationError && (
            <div className="flex items-center gap-2 p-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="ID (Brinco/Tatuagem): Código alfanumérico único para identificação visual ou eletrônica do animal no rebanho.">ID (Brinco/Tatuagem) *</label>
              <input
                type="text"
                required
                placeholder="Ex: BOV-A05"
                value={id}
                onChange={e => setId(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Nome / Apelido: Identificação nominativa ou apelido comercial do animal usado para manejo prático.">Nome / Apelido *</label>
              <input
                type="text"
                required
                placeholder="Ex: Nelore Pampa Jr"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Espécie: Espécie do animal. O sistema está configurado para Bovinos de Corte.">Espécie</label>
              <input
                type="text"
                disabled
                value="Bovino de Corte"
                className="w-full text-xs border border-gray-200 bg-gray-50 rounded-md p-2 text-gray-400 cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Sexo: Sexo biológico do animal. Machos habilitam medições de Perímetro Escrotal (PE).">Sexo</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as Sex)}
                className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
              >
                <option value="M">Macho</option>
                <option value="F">Fêmea</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Data de Nascimento: Data exata de nascimento. Necessária para cálculo automático de GC e idade.">Data de Nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="ID Pai (Sire): ID único do touro pai. Permite calcular o parentesco e herdar características de pedigree.">ID Pai (Sire)</label>
              <input
                type="text"
                placeholder="Opcional"
                value={sireId}
                onChange={e => setSireId(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="ID Mãe (Dam): ID único da vaca mãe. Usado para rastrear pedigree materno e habilidade maternal.">ID Mãe (Dam)</label>
              <input
                type="text"
                placeholder="Opcional"
                value={damId}
                onChange={e => setDamId(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Fazenda / Rebanho: Nome da fazenda ou lote de manejo geográfico onde o animal está localizado.">Fazenda / Rebanho</label>
              <input
                type="text"
                value={rebanho}
                onChange={e => setRebanho(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* Parent Verifier Auto-Alert Component */}
          {(liveSire !== null || liveDam !== null) && (
            <div className="p-3.5 bg-slate-900/5 border border-slate-200 rounded-xl space-y-2.5 shadow-sm" id="parent-checker-alert-creation">
              <div className="flex items-center justify-between border-b border-gray-250/60 pb-1.5">
                <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-gray-500 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-indigo-500" />
                  Verificador de Pedigree em Tempo Real
                </span>
                <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold">
                  Validação Coleta de Dados
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Sire Check */}
                {liveSire && (
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    liveSire.found
                      ? !liveSire.genderCorrect || !liveSire.speciesCorrect
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}>
                    <div className="mt-0.5 shrink-0">
                      {liveSire.found ? (
                        !liveSire.genderCorrect || !liveSire.speciesCorrect ? (
                          <span className="text-rose-500 font-bold block text-sm">❌</span>
                        ) : (
                          <span className="text-emerald-500 font-bold block text-sm">✅</span>
                        )
                      ) : (
                        <span className="text-amber-500 font-bold block text-sm">⚠️</span>
                      )}
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="font-bold flex items-center gap-1">
                        <span>Pai: {liveSire.id}</span>
                        {liveSire.found && (
                          <span className="text-[9px] bg-emerald-150 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold">
                            Localizado
                          </span>
                        )}
                      </div>
                      {liveSire.found ? (
                        <div className="text-[11px] opacity-90 space-y-0.5">
                          <p>Nome: <strong className="font-semibold">{liveSire.animal?.name}</strong> ({liveSire.animal?.rebanho})</p>
                          {!liveSire.genderCorrect && (
                            <p className="text-rose-600 font-medium leading-tight">
                              ⚠️ Sexo Incorreto: O animal {liveSire.id} está cadastrado como fêmea, mas foi informado como Pai.
                            </p>
                          )}
                          {!liveSire.speciesCorrect && (
                            <p className="text-rose-600 font-medium leading-tight">
                              ⚠️ Espécie divergente: O pai é {liveSire.animal?.species} mas o filhote é {species}.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] opacity-90 leading-tight">
                          Pai não encontrado no rebanho. Caso salve, será considerado um <strong>Macho Fundador</strong> sem pedigree conhecido.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Dam Check */}
                {liveDam && (
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    liveDam.found
                      ? !liveDam.genderCorrect || !liveDam.speciesCorrect
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}>
                    <div className="mt-0.5 shrink-0">
                      {liveDam.found ? (
                        !liveDam.genderCorrect || !liveDam.speciesCorrect ? (
                          <span className="text-rose-500 font-bold block text-sm">❌</span>
                        ) : (
                          <span className="text-emerald-500 font-bold block text-sm">✅</span>
                        )
                      ) : (
                        <span className="text-amber-500 font-bold block text-sm">⚠️</span>
                      )}
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="font-bold flex items-center gap-1">
                        <span>Mãe: {liveDam.id}</span>
                        {liveDam.found && (
                          <span className="text-[9px] bg-emerald-150 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold">
                            Localizada
                          </span>
                        )}
                      </div>
                      {liveDam.found ? (
                        <div className="text-[11px] opacity-90 space-y-0.5">
                          <p>Nome: <strong className="font-semibold">{liveDam.animal?.name}</strong> ({liveDam.animal?.rebanho})</p>
                          {!liveDam.genderCorrect && (
                            <p className="text-rose-600 font-medium leading-tight">
                              ⚠️ Sexo Incorreto: O animal {liveDam.id} está cadastrado como macho, mas foi informado como Mãe.
                            </p>
                          )}
                          {!liveDam.speciesCorrect && (
                            <p className="text-rose-600 font-medium leading-tight">
                              ⚠️ Espécie divergente: A mãe é {liveDam.animal?.species} mas o filhote é {species}.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] opacity-90 leading-tight">
                          Mãe não encontrada no rebanho. Caso salve, será considerada uma <strong>Fêmea Fundadeira</strong> sem pedigree conhecido.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {((liveSire && !liveSire.found) || (liveDam && !liveDam.found)) && (
                <div className="mt-3 pt-3 border-t border-gray-250/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/45">
                  <div className="flex items-start gap-2 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-tight flex-1">
                      <span className="font-bold block text-amber-950 mb-0.5">Aviso de Genealogia Incompleta:</span>
                      Você descreveu um ID que não possui cadastro completo no sistema. O animal será inserido, mas considerado fundador.
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-amber-200 px-3 py-1.5 rounded-lg shadow-xs hover:bg-amber-50/70 transition shrink-0 select-none">
                    <input
                      type="checkbox"
                      checked={bypassPedigreeWarning}
                      onChange={e => setBypassPedigreeWarning(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-800">
                      Confirmar cadastros ausentes
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Breed composition section */}
          <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-2">
            <h4 className="text-[10px] uppercase font-bold text-gray-400">Composição de Grau de Sangue (Multirracial)</h4>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Raça Principal: Raça predominante na composição de sangue do animal (Ex: Nelore, Angus).">Raça Principal</label>
                <input
                  type="text"
                  placeholder="Nelore"
                  value={breed1}
                  onChange={e => setBreed1(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Porcentagem Raça Principal (%): Porcentagem de participação genética da raça principal na composição (de 0 a 100%).">Porcentagem Raça Principal (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={pct1}
                  onChange={e => setPct1(Number(e.target.value))}
                  className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Raça Secundária (Cruzamentos): Segunda raça em esquemas de cruzamento industrial (opcional).">Raça Secundária (Cruzamentos)</label>
                <input
                  type="text"
                  placeholder="Ex: Angus, Hereford, Senepol"
                  value={breed2}
                  onChange={e => setBreed2(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Porcentagem Raça 2 (%): Porcentagem de participação genética da raça secundária (opcional).">Porcentagem Raça 2 (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={pct2}
                  onChange={e => setPct2(Number(e.target.value))}
                  className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Raça Terciária (Cruzamentos): Terceira raça em esquemas de cruzamento de três vias ou tri-cross (opcional).">Raça Terciária (Cruzamentos)</label>
                <input
                  type="text"
                  placeholder="Ex: Gir, Caracu"
                  value={breed3}
                  onChange={e => setBreed3(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Porcentagem Raça 3 (%): Porcentagem de participação genética da raça terciária (opcional).">Porcentagem Raça 3 (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={pct3}
                  onChange={e => setPct3(Number(e.target.value))}
                  className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Phenotypes values inputs */}
          <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-3">
            <h4 className="text-[10px] uppercase font-bold text-gray-400">Coleta Fisiológica e Mensurações</h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Peso ao Nascimento (PN): Peso do filhote ao nascer em kg. Monitorar evita distocias (partos difíceis).">P. Nac (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 33"
                  value={pn}
                  onChange={e => setPn(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(pn, 'pn', species) ? 'border-amber-400 bg-amber-50 focus:ring-amber-400' : 'border-gray-200'}`}
                />
                {getBiologicalWarning(pn, 'pn', species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(pn, 'pn', species)}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Peso ao Desmame (PD): Peso aferido no momento do desmame aos 205 dias (kg). Reflete o crescimento próprio do bezerro e a habilidade de produção de leite da mãe.">P. Desmame (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 210"
                  value={pd}
                  onChange={e => setPd(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(pd, 'pd', species) ? 'border-amber-400 bg-amber-50 focus:ring-amber-400' : 'border-gray-200'}`}
                />
                {getBiologicalWarning(pd, 'pd', species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(pd, 'pd', species)}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Peso ao Sobreano (PS): Peso aferido entre 15 e 18 meses de idade (kg). Avalia a capacidade de engorda pós-desmama e precocidade de ganho de peso.">P. Sobreano (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 400"
                  value={ps}
                  onChange={e => setPs(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(ps, 'ps', species) ? 'border-amber-400 bg-amber-50 focus:ring-amber-400' : 'border-gray-200'}`}
                />
                {getBiologicalWarning(ps, 'ps', species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(ps, 'ps', species)}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Perímetro Escrotal (PE): Medido na maior circunferência testicular em centímetros. Correlaciona-se com precocidade sexual nas fêmeas e na fertilidade dos machos.">P. Escrotal (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 35"
                  value={pe}
                  disabled={sex === 'F'}
                  onChange={e => setPe(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs border rounded-md p-1.5 disabled:bg-gray-100 disabled:cursor-not-allowed ${getBiologicalWarning(pe, 'pe', species) ? 'border-amber-400 bg-amber-50 focus:ring-amber-400' : 'border-gray-200'}`}
                />
                {getBiologicalWarning(pe, 'pe', species) && sex !== 'F' && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(pe, 'pe', species)}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Área de Olho de Lombo (AOL): Mensurada por ultrassonografia (cm²). Excelente preditora de rendimento de carcaça e musculosidade corporal.">AOL (cm²)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ultrabass"
                  value={aol}
                  onChange={e => setAol(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(aol, 'aol', species) ? 'border-amber-400 bg-amber-50 focus:ring-amber-400' : 'border-gray-200'}`}
                />
                {getBiologicalWarning(aol, 'aol', species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(aol, 'aol', species)}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Espessura de Gordura Subcutânea (EGS): Mensurada no lombo por ultrassom (mm). Garante a conservação fria no frigorífico e a resiliência reprodutiva de matrizes.">EGS (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ultrabass"
                  value={egs}
                  onChange={e => setEgs(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(egs, 'egs', species) ? 'border-amber-400 bg-amber-50 focus:ring-amber-400' : 'border-gray-200'}`}
                />
                {getBiologicalWarning(egs, 'egs', species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(egs, 'egs', species)}</p>}
              </div>
            </div>

            {/* Nova Seção: Características Avançadas de Bovinos de Corte */}
            <h5 className="text-[9px] uppercase font-bold text-gray-400/90 pt-1">Eficiência Alimentar, Temperamento e Adaptabilidade</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Consumo Alimentar Residual (CAR): Quantidade de matéria seca consumida além ou aquém do esperado para o ganho de peso e tamanho corporal (kg/dia). Valores negativos indicam maior eficiência alimentar.">CAR (kg MS/dia)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: -0.25"
                  value={car}
                  onChange={e => setCar(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(car, 'car', species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                />
                {getBiologicalWarning(car, 'car', species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(car, 'car', species)}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Temperamento / Reatividade: Avaliação visual da docilidade do animal ao manejo no tronco (Escore 1 a 5). 1 = extremamente calmo, 5 = agressivo/reativo.">Temperamento (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  placeholder="Ex: 2"
                  value={temperamento}
                  onChange={e => setTemperamento(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(temperamento, 'temperamento', species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                />
                {getBiologicalWarning(temperamento, 'temperamento', species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(temperamento, 'temperamento', species)}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Resistência a Carrapatos: Capacidade genética e imunológica do bovino de combater infestação de carrapatos (Escore 1 a 5). 1 = muito suscetível, 5 = muito resistente.">Resist. Carrapato (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  placeholder="Ex: 4"
                  value={resistenciaCarrapato}
                  onChange={e => setResistenciaCarrapato(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(resistenciaCarrapato, 'resistenciaCarrapato', species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                />
                {getBiologicalWarning(resistenciaCarrapato, 'resistenciaCarrapato', species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(resistenciaCarrapato, 'resistenciaCarrapato', species)}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Stayability / Longevidade Produtiva: Probabilidade estimada (%) de a fêmea permanecer produtiva e parir regularmente no rebanho até os 76 meses de idade.">Stayability (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Ex: 80"
                  value={stayability}
                  onChange={e => setStayability(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(stayability, 'stayability', species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                />
                {getBiologicalWarning(stayability, 'stayability', species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(stayability, 'stayability', species)}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Manejo Alimentar: Regime ou lote nutricional sob o qual o animal é mantido. Afeta a formação de Grupos Contemporâneos (GC).">Manejo Alimentar</label>
                <select
                  value={manejo}
                  onChange={e => setManejo(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-md p-1.5"
                >
                  <option value="Pasto">Pastagem Extensiva</option>
                  <option value="Semiextensivo">Semi-Extensivo (Concentrado 0.5%)</option>
                  <option value="Suplementado">Suplementado / Pastagem Anual</option>
                  <option value="Confinamento">Confinamento Fechado</option>
                </select>
              </div>

              {/* Graphical Morphological scoring */}
              <div className="col-span-3 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Estrutura Corporal (E): Tamanho de esqueleto, comprimento corporal e sustentação óssea. Escala de 1 (pequeno/frágil) a 5 (esqueleto ideal/forte).">
                    EPMUR - E (Estrut.: 1-5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={score1}
                    onChange={e => setScore1(Number(e.target.value))}
                    className="w-full h-1 bg-indigo-100 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                  <span className="text-[10px] font-mono font-bold text-indigo-700 block text-right">Escore: {score1}</span>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Precocidade (P): Velocidade de acabamento e rapidez com que o animal atinge o grau ideal de gordura subcutânea na carcaça. Escala de 1 (tardio/pouco acabamento) a 5 (precoce/gordura excelente).">
                    EPMUR - P (Precoc.: 1-5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={score2}
                    onChange={e => setScore2(Number(e.target.value))}
                    className="w-full h-1 bg-indigo-100 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                  <span className="text-[10px] font-mono font-bold text-indigo-700 block text-right">Escore: {score2}</span>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Muscularidade (M): Evidência do volume muscular, convexidade de lombo, espessura e largura de pernil ou coxa traseira. Escala de 1 (musculatura extremamente fraca) a 5 (musculoso/carcaça convexa).">
                    EPMUR - M (Muscul.: 1-5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={score3}
                    onChange={e => setScore3(Number(e.target.value))}
                    className="w-full h-1 bg-indigo-100 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                  <span className="text-[10px] font-mono font-bold text-indigo-700 block text-right">Escore: {score3}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 p-2.5 rounded-lg text-white font-semibold text-xs tracking-wide transition shadow-sm"
          >
            Registrar Fenótipo e Computar no Sistema
          </button>
        </form>
      )}

      {/* Filter and Table of active group */}
      <div className="flex flex-col gap-4 mb-5 border-b border-gray-100 pb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">Plantel de Bovinos de Corte</span>
          </div>

          {/* Reset Filters / Matching Total indicators */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[11px] text-gray-500 font-mono font-bold uppercase">
              Resultado: <strong className="text-indigo-600 font-black">{filteredAnimals.length}</strong> {filteredAnimals.length === 1 ? 'animal' : 'animais'}
            </span>
            {(searchQuery || selectedSex !== 'all' || selectedBreed !== 'all' || selectedRebanho !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSex('all');
                  setSelectedBreed('all');
                  setSelectedRebanho('all');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold border-b border-dashed border-indigo-400 hover:border-indigo-600 transition"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Search & Fine-grained filters grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search bar with magnifying glass icon */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Buscar ID ou Nome do Animal..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-2 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <div className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none">
              <Search className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          {/* Sex filter dropdown */}
          <div>
            <select
              value={selectedSex}
              onChange={e => setSelectedSex(e.target.value as any)}
              className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white text-gray-700 font-medium focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">Todos os Sexos</option>
              <option value="M">Apenas Machos (M)</option>
              <option value="F">Apenas Fêmeas (F)</option>
            </select>
          </div>

          {/* Breed filter dropdown */}
          <div>
            <select
              value={selectedBreed}
              onChange={e => setSelectedBreed(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white text-gray-700 font-medium focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">Todas as Raças</option>
              {availableBreeds.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Propriedade rural filter dropdown */}
          <div>
            <select
              value={selectedRebanho}
              onChange={e => setSelectedRebanho(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white text-gray-700 font-medium focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">Todas as Propriedades</option>
              {availableRebanhos.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-3xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/75 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider text-[10px]">
              <th className="p-3">Animal</th>
              <th className="p-3">Genealogia (Pai x Mãe)</th>
              <th className="p-3">Composição Racial</th>
              <th className="p-3">Grupo Contemporâneos (GC)</th>
              <th className="p-3 text-center">Peso Desmame (kg)</th>
              <th className="p-3 text-center">Peso Sobreano (kg)</th>
              <th className="p-3 text-center">GMD (g/dia)</th>
              <th className="p-3 text-center">AOL (cm²)</th>
              <th className="p-3 text-center">Eficiência & Adaptabilidade</th>
              <th className="p-3 text-center">Ecoes CPM/EPMUR</th>
              <th className="p-3 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredAnimals.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-gray-400 italic">
                  Nenhum animal cadastrado nesta espécie.
                </td>
              </tr>
            ) : (
              filteredAnimals.map(a => {
                const isCross = Object.keys(a.breedComp).length > 1;
                const breedStr = Object.entries(a.breedComp)
                  .map(([b, p]) => `${(Number(p) * 100).toFixed(0)}% ${b}`)
                  .join(' + ');

                return (
                  <tr key={a.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 font-mono text-[11px]">{a.id}</span>
                        <span className="text-gray-500 text-[10px] truncate max-w-[140px]" title={a.name}>
                          {a.name}
                        </span>
                        <span className="inline-flex mt-1 w-max items-center px-1 py-0.2 rounded-sm bg-gray-100 text-gray-600 text-[9px] uppercase font-bold">
                          {a.species} • {a.sex === 'M' ? 'Macho' : 'Fêmea'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col text-[10px] text-gray-600 font-mono">
                        <span>Pai: {a.sireId || 'Desconhecido'}</span>
                        <span>Mãe: {a.damId || 'Desconhecida'}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isCross ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {breedStr}
                        </span>
                        {isCross && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[9px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded-sm cursor-help"
                            title={`Heterozigose Individual (H) estimada: ${((a.heterozygosity ?? 0) * 100).toFixed(0)}%. O grau de vigor híbrido (fração de locos heterozigotos) retido para as características de desempenho do animal.`}
                          >
                            Heterozigose: {((a.heterozygosity ?? 0) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-indigo-950 font-medium">
                        {generateContemporaryGroup(a)}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-gray-800">
                      {a.phenotypes.pesoDesmame !== undefined ? `${a.phenotypes.pesoDesmame} kg` : '-'}
                    </td>
                    <td className="p-3 text-center font-bold text-gray-800">
                      {a.phenotypes.pesoSobreano !== undefined ? `${a.phenotypes.pesoSobreano} kg` : '-'}
                    </td>
                    <td className="p-3 text-center font-mono text-indigo-700 font-semibold">
                      {a.phenotypes.gmd !== undefined ? `${a.phenotypes.gmd}g` : '-'}
                    </td>
                    <td className="p-3 text-center font-semibold text-gray-600">
                      {a.phenotypes.aol !== undefined ? `${a.phenotypes.aol} cm²` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-0.5 text-[10px] leading-tight">
                        {a.phenotypes.car !== undefined && a.phenotypes.car !== null && (
                          <span className="text-emerald-700 font-semibold" title="Consumo Alimentar Residual">CAR: {a.phenotypes.car} kg/d</span>
                        )}
                        {a.phenotypes.temperamento !== undefined && a.phenotypes.temperamento !== null && (
                          <span className="text-indigo-700 font-semibold" title="Temperamento/Docilidade">Temp: {a.phenotypes.temperamento}/5</span>
                        )}
                        {a.phenotypes.resistenciaCarrapato !== undefined && a.phenotypes.resistenciaCarrapato !== null && (
                          <span className="text-amber-700 font-semibold" title="Resistência a Carrapatos">Carrap.: {a.phenotypes.resistenciaCarrapato}/5</span>
                        )}
                        {a.phenotypes.stayability !== undefined && a.phenotypes.stayability !== null && (
                          <span className="text-rose-700 font-semibold" title="Stayability / Longevidade">Stay: {a.phenotypes.stayability}%</span>
                        )}
                        {a.phenotypes.car === undefined && a.phenotypes.temperamento === undefined && a.phenotypes.resistenciaCarrapato === undefined && a.phenotypes.stayability === undefined && (
                          <span className="text-gray-400 font-mono">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-0.5 text-[10px] leading-tight">
                        <span className="bg-orange-50 text-orange-800 px-1.5 py-0.5 rounded-[3px] font-semibold w-11 text-center" title="Estrutura">E: {a.phenotypes.epmur_E || '-'}</span>
                        <span className="bg-orange-50 text-orange-800 px-1.5 py-0.5 rounded-[3px] font-semibold w-11 text-center" title="Precocidade">P: {a.phenotypes.epmur_P || '-'}</span>
                        <span className="bg-orange-50 text-orange-800 px-1.5 py-0.5 rounded-[3px] font-semibold w-11 text-center" title="Musculatura">M: {a.phenotypes.epmur_M || '-'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => startEditing(a)}
                          className="p-1.5 border border-indigo-100 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteAnimal(a.id)}
                          className="p-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50 transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100 flex items-start gap-2 mt-4 text-[11px] text-indigo-900 leading-relaxed">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong>Cálculo do Segmento GMD:</strong> Ganho de Peso Médio Diário é estimado de maneira automatizada ao preencher o Peso ao Desmame e Peso ao Sobreano, simulando a régua fisiológica padrão de 160 dias pós-desmame.
        </div>
      </div>
        </>
      )}

      {editingAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          {/* Main Modal container */}
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Editar Cadastro de Campo • {editingAnimal.id}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Atualize as informações reprodutivas, composições raciais e fenotipagens.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAnimal(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg select-none p-1.5"
              >
                &times;
              </button>
            </div>

            {/* Validation Errors inside modal */}
            {editValidationError && (
              <div className="flex items-center gap-2 p-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editValidationError}</span>
              </div>
            )}

            {/* Edit Field Inputs */}
            <form onSubmit={handleEditFormSubmit} className="space-y-4 text-xs">
              
              {/* Primary Identity Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="ID (Brinco/Tatuagem): Código alfanumérico único para identificação visual ou eletrônica do animal no rebanho.">ID (Brinco/Tatuagem)</label>
                  <input
                    type="text"
                    disabled
                    value={editingAnimal.id}
                    className="w-full text-xs border border-gray-200 bg-gray-50 rounded-md p-2 text-gray-400 cursor-not-allowed font-mono"
                  />
                  <span className="text-[9px] text-gray-400 mt-0.5 block">O ID não pode ser editado pois é a chave de parentesco.</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Nome / Apelido: Identificação nominativa ou apelido comercial do animal usado para manejo prático.">Nome / Apelido *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Nelore Pampa Jr"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Espécie: Espécie do animal. O sistema está configurado para Bovinos de Corte.">Espécie</label>
                  <input
                    type="text"
                    disabled
                    value="Bovino de Corte"
                    className="w-full text-xs border border-gray-200 bg-gray-50 rounded-md p-2 text-gray-400 cursor-not-allowed font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Sexo: Sexo biológico do animal. Machos habilitam medições de Perímetro Escrotal (PE).">Sexo</label>
                  <select
                    value={editSex}
                    onChange={(e) => setEditSex(e.target.value as Sex)}
                    className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
                  >
                    <option value="M">Macho</option>
                    <option value="F">Fêmea</option>
                  </select>
                </div>
              </div>

              {/* Pedigree & Origin */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Data de Nascimento: Data exata de nascimento. Necessária para cálculo automático de GC e idade.">Data de Nascimento</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={e => setEditBirthDate(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="ID Pai (Sire): ID único do touro pai. Permite calcular o parentesco e herdar características de pedigree.">ID Pai (Sire)</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={editSireId}
                    onChange={e => setEditSireId(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="ID Mãe (Dam): ID único da vaca mãe. Usado para rastrear pedigree materno e habilidade maternal.">ID Mãe (Dam)</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={editDamId}
                    onChange={e => setEditDamId(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Fazenda / Rebanho: Nome da fazenda ou lote de manejo geográfico onde o animal está localizado.">Fazenda / Rebanho</label>
                  <input
                    type="text"
                    value={editRebanho}
                    onChange={e => setEditRebanho(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
                  />
                </div>
              </div>

              {/* Parent Verifier Auto-Alert Component for Edit Modal */}
              {(liveEditSire !== null || liveEditDam !== null) && (
                <div className="p-3.5 bg-slate-900/5 border border-slate-200 rounded-xl space-y-2.5 shadow-sm" id="parent-checker-alert-edit">
                  <div className="flex items-center justify-between border-b border-gray-250/60 pb-1.5">
                    <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-gray-500 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-indigo-500" />
                      Verificador de Pedigree em Tempo Real
                    </span>
                    <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold">
                      Validação Edição Animal
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Sire Check */}
                    {liveEditSire && (
                      <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                        liveEditSire.found
                          ? !liveEditSire.genderCorrect || !liveEditSire.speciesCorrect
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}>
                        <div className="mt-0.5 shrink-0">
                          {liveEditSire.found ? (
                            !liveEditSire.genderCorrect || !liveEditSire.speciesCorrect ? (
                              <span className="text-rose-500 font-bold block text-sm">❌</span>
                            ) : (
                              <span className="text-emerald-500 font-bold block text-sm">✅</span>
                            )
                          ) : (
                            <span className="text-amber-500 font-bold block text-sm">⚠️</span>
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="font-bold flex items-center gap-1">
                            <span>Pai: {liveEditSire.id}</span>
                            {liveEditSire.found && (
                              <span className="text-[9px] bg-emerald-150 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold">
                                Localizado
                              </span>
                            )}
                          </div>
                          {liveEditSire.found ? (
                            <div className="text-[11px] opacity-90 space-y-0.5">
                              <p>Nome: <strong className="font-semibold">{liveEditSire.animal?.name}</strong> ({liveEditSire.animal?.rebanho})</p>
                              {!liveEditSire.genderCorrect && (
                                <p className="text-rose-600 font-medium leading-tight">
                                  ⚠️ Sexo Incorreto: O animal {liveEditSire.id} está cadastrado como fêmea, mas foi informado como Pai.
                                </p>
                              )}
                              {!liveEditSire.speciesCorrect && (
                                <p className="text-rose-600 font-medium leading-tight">
                                  ⚠️ Espécie divergente: O pai é {liveEditSire.animal?.species} mas o filhote é {editingAnimal?.species}.
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] opacity-90 leading-tight">
                              Pai não encontrado no rebanho. Caso salve, será considerado um <strong>Macho Fundador</strong> sem pedigree conhecido.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dam Check */}
                    {liveEditDam && (
                      <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                        liveEditDam.found
                          ? !liveEditDam.genderCorrect || !liveEditDam.speciesCorrect
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}>
                        <div className="mt-0.5 shrink-0">
                          {liveEditDam.found ? (
                            !liveEditDam.genderCorrect || !liveEditDam.speciesCorrect ? (
                              <span className="text-rose-500 font-bold block text-sm">❌</span>
                            ) : (
                              <span className="text-emerald-500 font-bold block text-sm">✅</span>
                            )
                          ) : (
                            <span className="text-amber-500 font-bold block text-sm">⚠️</span>
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="font-bold flex items-center gap-1">
                            <span>Mãe: {liveEditDam.id}</span>
                            {liveEditDam.found && (
                              <span className="text-[9px] bg-emerald-150 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold">
                                Localizada
                              </span>
                            )}
                          </div>
                          {liveEditDam.found ? (
                            <div className="text-[11px] opacity-90 space-y-0.5">
                              <p>Nome: <strong className="font-semibold">{liveEditDam.animal?.name}</strong> ({liveEditDam.animal?.rebanho})</p>
                              {!liveEditDam.genderCorrect && (
                                <p className="text-rose-600 font-medium leading-tight">
                                  ⚠️ Sexo Incorreto: O animal {liveEditDam.id} está cadastrado como macho, mas foi informado como Mãe.
                                </p>
                              )}
                              {!liveEditDam.speciesCorrect && (
                                <p className="text-rose-600 font-medium leading-tight">
                                  ⚠️ Espécie divergente: A mãe é {liveEditDam.animal?.species} mas o filhote é {editingAnimal?.species}.
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] opacity-90 leading-tight">
                              Mãe não encontrada no rebanho. Caso salve, será considerada uma <strong>Fêmea Fundadeira</strong> sem pedigree conhecido.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {((liveEditSire && !liveEditSire.found) || (liveEditDam && !liveEditDam.found)) && (
                    <div className="mt-3 pt-3 border-t border-gray-250/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/45">
                      <div className="flex items-start gap-2 text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-tight flex-1">
                          <span className="font-bold block text-amber-950 mb-0.5">Aviso de Genealogia Incompleta:</span>
                          Você descreveu um ID que não possui cadastro completo no sistema. O animal será inserido, mas considerado fundador.
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer bg-white border border-amber-200 px-3 py-1.5 rounded-lg shadow-xs hover:bg-amber-50/70 transition shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={bypassEditPedigreeWarning}
                          onChange={e => setBypassEditPedigreeWarning(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-slate-800">
                          Confirmar cadastros ausentes
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Breed composition section */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-500">Composição de Grau de Sangue (Multirracial)</h4>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Raça Principal: Raça predominante na composição de sangue do animal (Ex: Nelore, Angus).">Raça Principal</label>
                    <input
                      type="text"
                      value={editBreed1}
                      onChange={e => setEditBreed1(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-medium cursor-help border-b border-dashed border-gray-300 w-max" title="Porcentagem Raça Principal (%): Porcentagem de participação genética da raça principal na composição (de 0 a 100%).">Porcentagem Raça Principal (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editPct1}
                      onChange={e => setEditPct1(Number(e.target.value))}
                      className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-medium cursor-help border-b border-dashed border-gray-300 w-max" title="Raça Secundária: Segunda raça em esquemas de cruzamento industrial (opcional).">Raça Secundária</label>
                    <input
                      type="text"
                      placeholder="Sem cruzamento"
                      value={editBreed2}
                      onChange={e => setEditBreed2(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-medium cursor-help border-b border-dashed border-gray-300 w-max" title="Porcentagem Raça 2 (%): Porcentagem de participação genética da raça secundária (opcional).">Porcentagem Raça 2 (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editPct2}
                      onChange={e => setEditPct2(Number(e.target.value))}
                      className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-medium cursor-help border-b border-dashed border-gray-300 w-max" title="Raça Terciária (Cruzamentos): Terceira raça em esquemas de cruzamento de três vias ou tri-cross (opcional).">Raça Terciária (Cruzamentos)</label>
                    <input
                      type="text"
                      placeholder="Sem cruzamento"
                      value={editBreed3}
                      onChange={e => setEditBreed3(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-medium cursor-help border-b border-dashed border-gray-300 w-max" title="Porcentagem Raça 3 (%): Porcentagem de participação genética da raça terciária (opcional).">Porcentagem Raça 3 (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editPct3}
                      onChange={e => setEditPct3(Number(e.target.value))}
                      className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Phenotypes values inputs */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-500">Coleta Fisiológica e Mensurações</h4>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Peso ao Nascimento (PN): Peso do filhote ao nascer em kg. Monitorar evita distocias (partos difíceis).">P. Nac (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="N/A"
                      value={editPn}
                      onChange={e => setEditPn(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(editPn, 'pn', editingAnimal.species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                    />
                    {getBiologicalWarning(editPn, 'pn', editingAnimal.species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(editPn, 'pn', editingAnimal.species)}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Peso ao Desmame (PD): Peso aferido ao desmame aos 205 dias em kg. Reflete crescimento próprio e habilidade materna de produção de leite.">P. Desmame (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="N/A"
                      value={editPd}
                      onChange={e => setEditPd(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(editPd, 'pd', editingAnimal.species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                    />
                    {getBiologicalWarning(editPd, 'pd', editingAnimal.species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(editPd, 'pd', editingAnimal.species)}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Peso ao Sobreano (PS): Peso aferido entre 15 e 18 meses em kg. Avalia ganho de peso pós-desmama e precocidade.">P. Sobreano (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="N/A"
                      value={editPs}
                      onChange={e => setEditPs(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(editPs, 'ps', editingAnimal.species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                    />
                    {getBiologicalWarning(editPs, 'ps', editingAnimal.species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(editPs, 'ps', editingAnimal.species)}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Perímetro Escrotal (PE): Circunferência escrotal em cm. Relacionado à precocidade sexual de filhas e fertilidade do touro.">P. Escrotal (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="N/A"
                      value={editPe}
                      disabled={editSex === 'F'}
                      onChange={e => setEditPe(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full text-xs border rounded-md p-1.5 disabled:bg-gray-100 disabled:cursor-not-allowed ${getBiologicalWarning(editPe, 'pe', editingAnimal.species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                    />
                    {getBiologicalWarning(editPe, 'pe', editingAnimal.species) && editSex !== 'F' && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(editPe, 'pe', editingAnimal.species)}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Área de Olho de Lombo (AOL): Medida por ultrassonografia em cm². Indica musculatura e rendimento de carcaça.">AOL (cm²)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="N/A"
                      value={editAol}
                      onChange={e => setEditAol(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(editAol, 'aol', editingAnimal.species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                    />
                    {getBiologicalWarning(editAol, 'aol', editingAnimal.species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(editAol, 'aol', editingAnimal.species)}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Espessura de Gordura Subcutânea (EGS): Espessura de gordura no lombo em mm por ultrassom. Crucial para acabamento de carcaça e sanidade reprodutiva.">EGS (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="N/A"
                      value={editEgs}
                      onChange={e => setEditEgs(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(editEgs, 'egs', editingAnimal.species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                    />
                    {getBiologicalWarning(editEgs, 'egs', editingAnimal.species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(editEgs, 'egs', editingAnimal.species)}</p>}
                  </div>
                </div>

                <h5 className="text-[9px] uppercase font-bold text-gray-400/90 pt-1">Eficiência Alimentar, Temperamento e Adaptabilidade</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Consumo Alimentar Residual (CAR): Consumo de alimento além ou aquém do esperado. Valores negativos indicam maior eficiência alimentar.">CAR (kg MS/dia)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: -0.25"
                      value={editCar}
                      onChange={e => setEditCar(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(editCar, 'car', editingAnimal.species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                    />
                    {getBiologicalWarning(editCar, 'car', editingAnimal.species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(editCar, 'car', editingAnimal.species)}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Temperamento/Reatividade: Escore visual de 1 (muito calmo) a 5 (agressivo) no tronco de contenção.">Temperamento (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      placeholder="Ex: 2"
                      value={editTemperamento}
                      onChange={e => setEditTemperamento(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(editTemperamento, 'temperamento', editingAnimal.species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                    />
                    {getBiologicalWarning(editTemperamento, 'temperamento', editingAnimal.species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(editTemperamento, 'temperamento', editingAnimal.species)}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Resistência a Carrapatos: Capacidade genética e imunológica de combater infestações. Escore 1 (suscetível) a 5 (muito resistente).">Resist. Carrapato (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      placeholder="Ex: 4"
                      value={editResistenciaCarrapato}
                      onChange={e => setEditResistenciaCarrapato(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(editResistenciaCarrapato, 'resistenciaCarrapato', editingAnimal.species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                    />
                    {getBiologicalWarning(editResistenciaCarrapato, 'resistenciaCarrapato', editingAnimal.species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(editResistenciaCarrapato, 'resistenciaCarrapato', editingAnimal.species)}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-300 w-max" title="Stayability: Probabilidade estimada de a fêmea parir com regularidade no rebanho até os 76 meses.">Stayability (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Ex: 80"
                      value={editStayability}
                      onChange={e => setEditStayability(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full text-xs border rounded-md p-1.5 ${getBiologicalWarning(editStayability, 'stayability', editingAnimal.species) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                    />
                    {getBiologicalWarning(editStayability, 'stayability', editingAnimal.species) && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{getBiologicalWarning(editStayability, 'stayability', editingAnimal.species)}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1 cursor-help border-b border-dashed border-gray-200 w-max" title="Manejo Alimentar: Regime ou lote nutricional sob o qual o animal é mantido. Afeta a formação de Grupos Contemporâneos (GC).">Manejo Alimentar</label>
                    <select
                      value={editManejo}
                      onChange={e => setEditManejo(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white"
                    >
                      <option value="Pasto">Pastagem Extensiva</option>
                      <option value="Semiextensivo">Semi-Extensivo (Concentrado 0.5%)</option>
                      <option value="Suplementado">Suplementado / Pastagem Anual</option>
                      <option value="Confinamento">Confinamento Fechado</option>
                    </select>
                  </div>

                  <div className="col-span-3 grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-medium">
                        EPMUR - E (Estrut.: 1-5)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={editScore1}
                        onChange={e => setEditScore1(Number(e.target.value))}
                        className="w-full h-1 bg-indigo-155 rounded-lg appearance-none cursor-pointer mt-2"
                      />
                      <span className="text-[10px] font-mono font-bold text-indigo-700 block text-right">Escore: {editScore1}</span>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-medium">
                        EPMUR - P (Precoc.: 1-5)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={editScore2}
                        onChange={e => setEditScore2(Number(e.target.value))}
                        className="w-full h-1 bg-indigo-155 rounded-lg appearance-none cursor-pointer mt-2"
                      />
                      <span className="text-[10px] font-mono font-bold text-indigo-700 block text-right">Escore: {editScore2}</span>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-medium">
                        EPMUR - M (Muscul.: 1-5)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={editScore3}
                        onChange={e => setEditScore3(Number(e.target.value))}
                        className="w-full h-1 bg-indigo-155 rounded-lg appearance-none cursor-pointer mt-2"
                      />
                      <span className="text-[10px] font-mono font-bold text-indigo-700 block text-right">Escore: {editScore3}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 font-semibold text-xs">
                <button
                  type="button"
                  onClick={() => setEditingAnimal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
