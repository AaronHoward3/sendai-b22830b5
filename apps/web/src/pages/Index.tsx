import EmailGenerator from "@/components/EmailGenerator";
import Navigation from "@/components/Navigation";

const Index = () => {
  return (
    <>
      <Navigation />
      <div className="pt-16">
        <EmailGenerator />
      </div>
    </>
  );
};

export default Index;
