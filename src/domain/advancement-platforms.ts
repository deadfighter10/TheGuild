export type PlatformLink = {
  readonly name: string
  readonly url: string
  readonly type: "github" | "paper" | "community" | "tool" | "dataset" | "organization"
  readonly description: string
}

export const ADVANCEMENT_PLATFORMS: Record<string, readonly PlatformLink[]> = {
  telomerase: [
    { name: "Aubrey de Grey / SENS Research", url: "https://www.sens.org", type: "organization", description: "Leading longevity research foundation" },
    { name: "Longevity Research on GitHub", url: "https://github.com/topics/longevity", type: "github", description: "Open-source longevity projects" },
    { name: "GeroScience (Journal)", url: "https://link.springer.com/journal/11357", type: "paper", description: "Peer-reviewed aging research" },
    { name: "Lifespan.io", url: "https://www.lifespan.io", type: "community", description: "Longevity advocacy and crowdfunding" },
  ],
  bci: [
    { name: "OpenBCI", url: "https://github.com/OpenBCI", type: "github", description: "Open-source brain-computer interface hardware and software" },
    { name: "BCI2000", url: "https://www.bci2000.org", type: "tool", description: "General-purpose BCI research platform" },
    { name: "NeuroTechX", url: "https://neurotechx.com", type: "community", description: "International neurotechnology community" },
    { name: "Journal of Neural Engineering", url: "https://iopscience.iop.org/journal/1741-2552", type: "paper", description: "Leading BCI research journal" },
  ],
  "tissue-engineering": [
    { name: "NIH Tissue Engineering", url: "https://www.nibib.nih.gov/science-education/science-topics/tissue-engineering-and-regenerative-medicine", type: "organization", description: "NIH resources on regenerative medicine" },
    { name: "Wake Forest Institute", url: "https://school.wakehealth.edu/research/institutes-and-centers/wake-forest-institute-for-regenerative-medicine", type: "organization", description: "Pioneering tissue engineering research" },
    { name: "Biomaterials (Journal)", url: "https://www.sciencedirect.com/journal/biomaterials", type: "paper", description: "Biomaterials and tissue engineering research" },
    { name: "3D Bioprinting on GitHub", url: "https://github.com/topics/bioprinting", type: "github", description: "Open-source bioprinting projects" },
  ],
  fusion: [
    { name: "ITER", url: "https://www.iter.org", type: "organization", description: "International thermonuclear experimental reactor" },
    { name: "Commonwealth Fusion Systems", url: "https://cfs.energy", type: "organization", description: "Compact fusion reactor development" },
    { name: "OpenMC", url: "https://github.com/openmc-dev/openmc", type: "github", description: "Open-source Monte Carlo particle transport code" },
    { name: "Nuclear Fusion (Journal)", url: "https://iopscience.iop.org/journal/0029-5515", type: "paper", description: "Leading fusion research journal" },
  ],
  crispr: [
    { name: "Addgene CRISPR Guide", url: "https://www.addgene.org/crispr/guide/", type: "tool", description: "Comprehensive CRISPR resources and plasmids" },
    { name: "CRISPResso2", url: "https://github.com/pinellolab/CRISPResso2", type: "github", description: "Analysis of genome editing outcomes" },
    { name: "Broad Institute GPP", url: "https://portals.broadinstitute.org/gpp/public/", type: "tool", description: "Genetic perturbation platform" },
    { name: "CRISPR Journal", url: "https://home.liebertpub.com/publications/the-crispr-journal/642", type: "paper", description: "Dedicated CRISPR research journal" },
  ],
  aagi: [
    { name: "Anthropic Research", url: "https://www.anthropic.com/research", type: "organization", description: "AI safety and capabilities research" },
    { name: "OpenAI Research", url: "https://openai.com/research", type: "organization", description: "AGI research and development" },
    { name: "Hugging Face", url: "https://github.com/huggingface", type: "github", description: "Open-source ML models and tools" },
    { name: "AI Alignment Forum", url: "https://www.alignmentforum.org", type: "community", description: "AI safety research discussion" },
    { name: "Papers With Code", url: "https://paperswithcode.com", type: "paper", description: "ML papers with reproducible code" },
    { name: "arXiv AI", url: "https://arxiv.org/list/cs.AI/recent", type: "paper", description: "Latest AI research preprints" },
  ],
} as const
