import Heading from "@/components/Heading.tsx";
import MeetHistoryItem from "@/components/UserProfile/MeetHistoryItem.tsx";

export default function MeetHistoryList({
  meetList,
  title,
  lang,
}: {
  meetList: any[];
  title: string;
  lang: string;
}) {
  return (
    <div>
      <Heading text={title} />
      <ul className="max-h-[350px] overflow-auto">
        {meetList.map((meet) => (
          <MeetHistoryItem
            key={meet.appointmentId}
            meetId={meet.appointmentId}
            meetName={meet.meetName}
            meetPlace={meet.meetPlace}
            lang={lang}
          />
        ))}
      </ul>
    </div>
  );
}
