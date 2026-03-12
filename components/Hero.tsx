import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-[#1A1A1A] flex items-center justify-center overflow-hidden pt-16">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #EEFF00 0, #EEFF00 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* Yellow accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#EEFF00]" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Badge */}
        <span className="inline-block bg-[#EEFF00] text-[#1A1A1A] text-xs font-bold uppercase tracking-widest px-4 py-1 mb-8">
          Maringá · PR
        </span>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tight leading-none mb-6">
          Moda que{" "}
          <span className="text-[#EEFF00]">inspira</span>
          <br />
          estilo que{" "}
          <span className="text-[#EEFF00]">move</span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
          Fitness e praia com muito estilo. Venha nos visitar ou peça pelo WhatsApp — atendemos você do jeito que preferir.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://wa.me/5544999893307"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#EEFF00] text-[#1A1A1A] font-bold text-sm px-8 py-4 uppercase tracking-widest hover:bg-yellow-300 transition-all hover:-translate-y-0.5"
          >
            Pedir pelo WhatsApp
          </a>
          <Link
            href="/#colecoes"
            className="border-2 border-white text-white font-bold text-sm px-8 py-4 uppercase tracking-widest hover:border-[#EEFF00] hover:text-[#EEFF00] transition-colors"
          >
            Ver Coleções
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto border-t border-gray-700 pt-10">
          <div>
            <div className="text-[#EEFF00] text-2xl font-black">+500</div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Produtos</div>
          </div>
          <div>
            <div className="text-[#EEFF00] text-2xl font-black">10+</div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Anos no mercado</div>
          </div>
          <div>
            <div className="text-[#EEFF00] text-2xl font-black">★ 4.8</div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Google</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
