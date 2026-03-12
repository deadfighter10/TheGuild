export type Advancement = {
  readonly id: string
  readonly name: string
  readonly description: string
}

export const ADVANCEMENTS: readonly Advancement[] = [
  {
    id: "telomerase",
    name: "Telomerase Activation and Senolytics",
    description:
      "Reversing cellular aging through telomerase activation and senolytic therapies that clear damaged cells.",
  },
  {
    id: "bci",
    name: "Brain-Machine Interfaces and Neural Prosthetics",
    description:
      "Direct communication pathways between the brain and external devices, enabling neural control and sensory restoration.",
  },
  {
    id: "tissue-engineering",
    name: "In Vivo Tissue Engineering",
    description:
      "Regenerative medicine through growing and repairing tissues and organs within the living body.",
  },
  {
    id: "fusion",
    name: "Nuclear Fusion",
    description:
      "Achieving sustainable clean energy through controlled nuclear fusion reactions.",
  },
  {
    id: "crispr",
    name: "CRISPR-Cas9 Gene Editing",
    description:
      "Precise genetic modification using CRISPR-Cas9 to treat diseases and enhance biological systems.",
  },
  {
    id: "aagi",
    name: "True AAGI",
    description:
      "Autonomous Artificial General Intelligence capable of independent reasoning and learning across all domains.",
  },
] as const
