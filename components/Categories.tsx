const categories = [
  {
    id: "fitness",
    label: "Fitness",
    description: "Leggings, tops, shorts, macacões e conjuntos para treinar com estilo.",
    icon: "🏋️",
    bg: "#1A1A1A",
    items: ["Leggings", "Tops", "Shorts", "Conjuntos", "Macacões"],
  },
  {
    id: "praia",
    label: "Praia",
    description: "Biquínis, sungas, saídas de praia e kits completos para arrasar.",
    icon: "🏖️",
    bg: "#111111",
    items: ["Biquínis", "Sungas", "Saídas de Praia", "Kits", "Acessórios"],
  },
  {
    id: "colecoes",
    label: "Coleções",
    description: "Looks curados por estação e tendências para você se inspirar.",
    icon: "✨",
    bg: "#1A1A1A",
    items: ["Verão", "Outono/Inverno", "Lançamentos", "Mais Vendidos"],
  },
];

export default function Categories() {
  return (
    <section id="fitness" className="bg-[#111111] py-24">
      <div className="max-w-7xl mx-auto px-4">
        {/* Title */}
        <div className="text-center mb-16">
          <span className="text-[#EEFF00] text-xs font-bold uppercase tracking-widest">
            O que temos para você
          </span>
          <h2 className="text-white text-4xl md:text-5xl font-black uppercase mt-3">
            Nossas Categorias
          </h2>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-3 gap-px bg-gray-800">
          {categories.map((cat) => (
            <div
              key={cat.id}
              id={cat.id}
              className="bg-[#1A1A1A] p-10 group hover:bg-[#222222] transition-colors"
            >
              <div className="text-4xl mb-6">{cat.icon}</div>
              <h3 className="text-white text-2xl font-black uppercase tracking-wide mb-3 group-hover:text-[#EEFF00] transition-colors">
                {cat.label}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {cat.description}
              </p>
              <ul className="space-y-2">
                {cat.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider">
                    <span className="w-1 h-1 bg-[#EEFF00] rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://wa.me/5544999893307"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 border border-gray-600 text-gray-400 text-xs uppercase tracking-widest px-4 py-2 hover:border-[#EEFF00] hover:text-[#EEFF00] transition-colors"
              >
                Ver pelo WhatsApp
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          ))}
        </div>

        {/* Promo Banner */}
        <div className="mt-px bg-[#EEFF00] p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[#1A1A1A] font-black text-xl uppercase tracking-wide">
              Visite nossa loja física
            </p>
            <p className="text-[#1A1A1A] text-sm mt-1">
              Av. Pedro Taques 2185, Jd Alvorada · Maringá-PR · Seg–Sáb 09h–18h
            </p>
          </div>
          <a
            href="https://wa.me/5544999893307"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1A1A1A] text-[#EEFF00] font-bold text-sm px-8 py-3 uppercase tracking-widest hover:bg-black transition-colors whitespace-nowrap"
          >
            Fale Conosco
          </a>
        </div>
      </div>
    </section>
  );
}
