import { getMemberInfo, getPersonalityCounseling } from "../actions";
import { PersonalityForm } from "./personality-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PersonalityPage({ params }: Props) {
  const { id } = await params;
  const [member, existing] = await Promise.all([
    getMemberInfo(id),
    getPersonalityCounseling(id),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PersonalityForm
        memberId={id}
        memberName={`${member.last_name} ${member.first_name}`}
        existing={existing}
      />
    </div>
  );
}
