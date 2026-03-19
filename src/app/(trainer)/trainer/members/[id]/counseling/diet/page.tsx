import { getMemberInfo, getDietCounseling } from "../actions";
import { DietForm } from "./diet-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DietCounselingPage({ params }: Props) {
  const { id } = await params;
  const [member, existing] = await Promise.all([
    getMemberInfo(id),
    getDietCounseling(id),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <DietForm
        memberId={id}
        memberName={`${member.last_name} ${member.first_name}`}
        existing={existing}
      />
    </div>
  );
}
