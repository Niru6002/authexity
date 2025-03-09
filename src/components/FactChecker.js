import { ArrowUpIcon } from "@heroicons/react/24/solid";

const FactChecker = ({ inputText, onSubmit, isLoading, results }) => {
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText && inputText.trim()) {
      onSubmit(inputText);
    }
  };

  return (
    <>
    </>
  );
};

export default FactChecker;
