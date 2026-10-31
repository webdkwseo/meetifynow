import Heading from "../Heading";
import StepIndicator from "./StepIndicator";

export default function StepsIndicator(props: {
  steps: number;
  stepsData: any;
  currIndex: number;
}) {
  const renderSteps = () => {
    const stepsItems = [];
    for (let i = 0; i < props.steps; i++) {
      stepsItems.push(
        <StepIndicator
          key={i}
          isCurrent={i === props.currIndex}
          isCompleted={i < props.currIndex}
          isLast={i === props.steps - 1}
          index={i}
          shouldAnimateLine={i + 1 === props.currIndex}
        />,
      );
    }
    return stepsItems;
  };

  return (
    <nav>
      <ol className="flex justify-center mb-5">{renderSteps()}</ol>
      <Heading text={props.stepsData[props.currIndex].title} />
    </nav>
  );
}
