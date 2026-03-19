import { getMemberInfo, getBodyCounseling } from "../actions";
import { BodyForm } from "./body-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BodyCounselingPage({ params }: Props) {
  const { id } = await params;
  const [member, existing] = await Promise.all([
    getMemberInfo(id),
    getBodyCounseling(id),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <BodyForm
        memberId={id}
        memberName={`${member.last_name} ${member.first_name}`}
        existing={existing}
      />
    </div>
  );
}
