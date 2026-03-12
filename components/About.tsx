import Image from "next/image";

export default function About() {
  return (
    <section id="sobre" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            <span className="text-[#EEFF00] bg-[#1A1A1A] text-xs font-bold uppercase tracking-widest px-3 py-1">
              Nossa história
            </span>
            <h2 className="text-[#1A1A1A] text-4xl md:text-5xl font-black uppercase mt-6 leading-tight">
              Estilo que<br />
              <span className="text-[#2E2E2E]">inspira</span>
            </h2>
            <p className="text-gray-500 mt-6 leading-relaxed">
              A MaxxiOne nasceu em Maringá com um propósito claro: levar moda fitness e praia de qualidade para quem vive em movimento. Somos uma loja física com atendimento personalizado e apaixonado por estilo.
            </p>
            <p className="text-gray-500 mt-4 leading-relaxed">
              Trabalhamos com as melhores marcas do segmento, atendendo mulheres e homens que buscam conforto, durabilidade e muito estilo — seja na academia, na praia ou no dia a dia.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-6">
              <div className="border-l-2 border-[#EEFF00] pl-4">
                <div className="text-[#1A1A1A] text-2xl font-black">Maringá-PR</div>
                <div className="text-gray-400 text-sm mt-1">Loja física desde o início</div>
              </div>
              <div className="border-l-2 border-[#EEFF00] pl-4">
                <div className="text-[#1A1A1A] text-2xl font-black">Envio</div>
                <div className="text-gray-400 text-sm mt-1">Para todo o Brasil</div>
              </div>
            </div>
          </div>

          {/* Logo / Visual */}
          <div className="relative">
            <div className="bg-[#1A1A1A] p-12 flex items-center justify-center">
              <Image
                src="/images/logo-banner.jpg"
                alt="MaxxiOne Fitness e Praia"
                width={500}
                height={250}
                className="w-full object-contain"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 bg-[#EEFF00] p-6">
              <p className="text-[#1A1A1A] font-black text-sm uppercase tracking-widest">
                Fitness<br />e Praia
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
