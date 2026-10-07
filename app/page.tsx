import Hero from "@/components/home/hero"
import  WhyChooseUs from "@/components/home/why-choose-us"
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
    
    <div>
      <Hero />
    </div>

    <div>
      <WhyChooseUs />
    </div>


    </main>
  );
}
