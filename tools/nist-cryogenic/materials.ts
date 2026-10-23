/**
 * Material catalog for the NIST cryogenic material-properties index
 * (https://trc.nist.gov/cryogenics/materials/materialproperties.htm), one entry
 * per index link, in index order. `file` is the snapshot under
 * data-sources/nist-cryogenic/<date>/pages/.
 *
 * Identity notes state only what the source says; anything the source leaves
 * unstated is recorded as unstated rather than assumed.
 */
export interface MaterialConfig {
  file: string
  id: string
  name: string
  family: string
  subfamily: string
  identityNotes: string[]
}

const NOT_STATED = 'Product form, condition, and direction are not stated by the source page.'

export const MATERIALS: MaterialConfig[] = [
  { file: 'Aluminum_1100.htm', id: 'al-1100', name: 'Aluminum 1100', family: 'Metal', subfamily: 'Wrought aluminum alloy', identityNotes: ['Temper not stated by the source page.', NOT_STATED] },
  { file: 'Aluminum_3003_F.htm', id: 'al-3003-f', name: 'Aluminum 3003-F', family: 'Metal', subfamily: 'Wrought aluminum alloy', identityNotes: [NOT_STATED] },
  { file: 'Aluminum_5083_O.htm', id: 'al-5083-o', name: 'Aluminum 5083-O', family: 'Metal', subfamily: 'Wrought aluminum alloy', identityNotes: [NOT_STATED] },
  { file: 'Aluminum_6061_T6.htm', id: 'al-6061-t6', name: 'Aluminum 6061-T6', family: 'Metal', subfamily: 'Wrought aluminum alloy', identityNotes: ['Page heading: 6061-T6 Aluminum (UNS A96061).', NOT_STATED] },
  { file: 'Aluminum_6063_T5.htm', id: 'al-6063-t5', name: 'Aluminum 6063-T5', family: 'Metal', subfamily: 'Wrought aluminum alloy', identityNotes: [NOT_STATED] },
  { file: 'Apiezon_N.htm', id: 'apiezon-n', name: 'Apiezon N', family: 'Other', subfamily: 'Cryogenic vacuum grease', identityNotes: [] },
  { file: 'Balsa.htm', id: 'balsa', name: 'Balsa', family: 'Natural material', subfamily: 'Wood', identityNotes: ['Densities are given per property column.'] },
  { file: 'Beechwood_phenolic.htm', id: 'beechwood-phenolic', name: 'Beechwood/phenolic', family: 'Composite', subfamily: 'Wood–phenolic laminate', identityNotes: ['Laminate construction and direction are given per property column.'] },
  { file: 'Beryllium.htm', id: 'beryllium', name: 'Beryllium', family: 'Metal', subfamily: 'Beryllium', identityNotes: ['Crystal direction is given per linear-expansion column.'] },
  { file: 'Beryllium_Copper.htm', id: 'beryllium-copper', name: 'Beryllium copper', family: 'Metal', subfamily: 'Copper alloy', identityNotes: ['Alloy designation and temper not stated by the source page.'] },
  { file: 'Brass.htm', id: 'brass', name: 'Brass', family: 'Metal', subfamily: 'Copper alloy', identityNotes: ['Alloy designation not stated by the source page.'] },
  { file: 'Copper_OFHC.htm', id: 'copper-ofhc', name: 'Copper (OFHC)', family: 'Metal', subfamily: 'Copper', identityNotes: ['Thermal conductivity is given for RRR 50, 100, 150, 300, and 500. NIST’s Bradley & Radebaugh tables describe this copper as ≥ 99.99 % purity (OFHC); standard grades 101/102 have RRR ≈ 100.'] },
  { file: 'Fiberglass_Epoxy_G_10.htm', id: 'g10-cr', name: 'G-10 CR fiberglass epoxy', family: 'Composite', subfamily: 'Glass-fiber epoxy laminate', identityNotes: ['Page heading: G-10 CR (Fiberglass Epoxy). Direction (normal / warp) is given per column.'] },
  { file: 'Glass_Fabric_polyester.htm', id: 'glass-fabric-polyester', name: 'Glass fabric/polyester', family: 'Composite', subfamily: 'Glass-fabric polyester laminate', identityNotes: ['Direction is given per column.'] },
  { file: 'Glass_mat_epoxy.htm', id: 'glass-mat-epoxy', name: 'Glass mat/epoxy', family: 'Composite', subfamily: 'Glass-mat epoxy laminate', identityNotes: ['Reinforcement form (chopped / continuous strand) is given per column.'] },
  { file: 'Inconel_718.htm', id: 'inconel-718', name: 'Inconel 718', family: 'Metal', subfamily: 'Nickel superalloy', identityNotes: ['Heat-treatment condition not stated by the source page.'] },
  { file: 'Indium.htm', id: 'indium', name: 'Indium', family: 'Metal', subfamily: 'Indium', identityNotes: [] },
  { file: 'Invar_Fe_36Ni.htm', id: 'invar-36', name: 'Invar (Fe-36Ni)', family: 'Metal', subfamily: 'Iron–nickel alloy', identityNotes: [NOT_STATED] },
  { file: 'Kevlar_49_Fiber.htm', id: 'kevlar-49-fiber', name: 'Kevlar-49 fiber', family: 'Polymer', subfamily: 'Aramid fiber', identityNotes: [] },
  { file: 'Kevlar_49_Composite.htm', id: 'kevlar-49-composite', name: 'Kevlar-49 composite', family: 'Composite', subfamily: 'Aramid-fiber composite', identityNotes: ['Matrix, layup, and direction not stated by the source page.'] },
  { file: 'Lead.htm', id: 'lead', name: 'Lead', family: 'Metal', subfamily: 'Lead', identityNotes: [] },
  { file: 'Molybdenum.htm', id: 'molybdenum', name: 'Molybdenum', family: 'Metal', subfamily: 'Refractory metal', identityNotes: [] },
  { file: 'Nickel_Steel_Fe_2_25_Ni.htm', id: 'ni-steel-2-25', name: 'Nickel steel Fe-2.25Ni', family: 'Metal', subfamily: 'Nickel steel', identityNotes: ['NIST publishes the same linear-expansion fit for all four nickel steels.'] },
  { file: 'Nickel_Steel_Fe_3_25_Ni.htm', id: 'ni-steel-3-25', name: 'Nickel steel Fe-3.25Ni', family: 'Metal', subfamily: 'Nickel steel', identityNotes: ['NIST index and page say Fe-3.25Ni; the NIST Bradley & Radebaugh tables label this alloy Fe-3.5Ni.', 'NIST publishes the same linear-expansion fit for all four nickel steels.'] },
  { file: 'Nickel_Steel_Fe_5_0_Ni.htm', id: 'ni-steel-5-0', name: 'Nickel steel Fe-5.0Ni', family: 'Metal', subfamily: 'Nickel steel', identityNotes: ['NIST publishes the same linear-expansion fit for all four nickel steels.'] },
  { file: 'Nickel_Steel_Fe_9_0_Ni.htm', id: 'ni-steel-9-0', name: 'Nickel steel Fe-9.0Ni', family: 'Metal', subfamily: 'Nickel steel', identityNotes: ['NIST publishes the same linear-expansion fit for all four nickel steels.'] },
  { file: 'Platinum.htm', id: 'platinum', name: 'Platinum', family: 'Metal', subfamily: 'Platinum', identityNotes: [] },
  { file: 'Polyamide_Nylon.htm', id: 'polyamide-nylon', name: 'Polyamide (Nylon)', family: 'Polymer', subfamily: 'Polyamide', identityNotes: ['Nylon type, filler, and moisture condition not stated by the source page.'] },
  { file: 'Polyethylene_Terephthalate_Mylar.htm', id: 'pet-mylar', name: 'Polyethylene terephthalate (Mylar)', family: 'Polymer', subfamily: 'Polyester (PET)', identityNotes: [] },
  { file: 'Polyimide_Kapton.htm', id: 'polyimide-kapton', name: 'Polyimide (Kapton)', family: 'Polymer', subfamily: 'Polyimide', identityNotes: [] },
  { file: 'Polystyrene.htm', id: 'polystyrene', name: 'Polystyrene (foam)', family: 'Polymer', subfamily: 'Polymer foam', identityNotes: ['Foam density is given per column; properties differ strongly with density.'] },
  { file: 'Polyurethane.htm', id: 'polyurethane', name: 'Polyurethane (foam)', family: 'Polymer', subfamily: 'Polymer foam', identityNotes: ['Foam density, blowing gas, and direction are given per column.'] },
  { file: 'Polyvinyl_Chloride_PVC.htm', id: 'pvc', name: 'Polyvinyl chloride (PVC)', family: 'Polymer', subfamily: 'Vinyl', identityNotes: ['Thermal conductivity and specific heat columns are for PVC foams of stated density; the linear-expansion column states no density or form.'] },
  { file: 'Sapphire.htm', id: 'sapphire', name: 'Sapphire', family: 'Ceramic', subfamily: 'Single-crystal Al₂O₃', identityNotes: ['Crystal orientation not stated by the source page.'] },
  { file: 'Silicon.htm', id: 'silicon', name: 'Silicon', family: 'Semiconductor', subfamily: 'Silicon', identityNotes: ['The NIST Bradley & Radebaugh reference list cites single-crystal silicon expansion measurements.'] },
  { file: 'Stainless_Steel_304.htm', id: 'ss-304', name: 'Stainless steel 304', family: 'Metal', subfamily: 'Austenitic stainless steel', identityNotes: ['Condition not stated. NIST publishes the same linear-expansion fit for 304, 304L, 310, and 316.'] },
  { file: 'Stainless_Steel_304L.htm', id: 'ss-304l', name: 'Stainless steel 304L', family: 'Metal', subfamily: 'Austenitic stainless steel', identityNotes: ['Condition not stated. NIST publishes the same linear-expansion fit for 304, 304L, 310, and 316.'] },
  { file: 'Stainless_Steel_310.htm', id: 'ss-310', name: 'Stainless steel 310', family: 'Metal', subfamily: 'Austenitic stainless steel', identityNotes: ['Condition not stated. NIST publishes the same linear-expansion fit for 304, 304L, 310, and 316.'] },
  { file: 'Stainless_Steel_316.htm', id: 'ss-316', name: 'Stainless steel 316', family: 'Metal', subfamily: 'Austenitic stainless steel', identityNotes: ['Condition not stated. NIST publishes the same linear-expansion fit for 304, 304L, 310, and 316.'] },
  { file: 'Teflon.htm', id: 'ptfe-teflon', name: 'PTFE (Teflon)', family: 'Polymer', subfamily: 'Fluoropolymer', identityNotes: ['Filled/unfilled grade not stated by the source page.'] },
  { file: 'Ti_6Al_4V.htm', id: 'ti-6al-4v', name: 'Ti-6Al-4V', family: 'Metal', subfamily: 'Titanium alloy', identityNotes: ['Condition not stated by the source page.'] },
  { file: 'Titanium_15_3_3_3.htm', id: 'ti-15-3-3-3', name: 'Titanium 15-3-3-3', family: 'Metal', subfamily: 'Beta titanium alloy', identityNotes: [] },
  { file: 'Regenerator_Materials.htm', id: 'regenerator-materials', name: 'Regenerator materials', family: 'Other', subfamily: 'Regenerator materials (volumetric heat capacity table)', identityNotes: ['Tabulated volumetric heat capacity for 30 materials; see regenerator-volumetric-heat-capacity.json.'] },
]
