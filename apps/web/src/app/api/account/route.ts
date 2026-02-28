import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function DELETE() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const { error: deleteError } =
            await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteError) {
            return NextResponse.json(
                { error: deleteError.message },
                { status: 500 },
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "account_deletion_failed";
        console.error("[account] delete failed:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
