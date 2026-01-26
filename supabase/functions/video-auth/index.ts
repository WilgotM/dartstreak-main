
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
            throw new Error("User not found");
        }

        const { action, ...payload } = await req.json();
        const CLOUDFLARE_APP_ID = Deno.env.get("CLOUDFLARE_APP_ID");
        const CLOUDFLARE_APP_SECRET = Deno.env.get("CLOUDFLARE_APP_SECRET");

        if (!CLOUDFLARE_APP_ID || !CLOUDFLARE_APP_SECRET) {
            console.error("Missing Cloudflare credentials");
            throw new Error("Server configuration error");
        }

        const BASE_URL = `https://rtc.live.cloudflare.com/v1/apps/${CLOUDFLARE_APP_ID}`;

        if (action === "create_session") {
            const response = await fetch(`${BASE_URL}/sessions/new`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${CLOUDFLARE_APP_SECRET}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(JSON.stringify(data));

            return new Response(JSON.stringify({ sessionId: data.sessionId }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "proxy") {
            const { path, method = "POST", body } = payload;

            const response = await fetch(`${BASE_URL}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${CLOUDFLARE_APP_SECRET}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();
            if (!response.ok) {
                console.error("Cloudflare Proxy Error:", JSON.stringify(data));
                throw new Error(`Cloudflare Error (${response.status}): ${JSON.stringify(data)}`);
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        throw new Error("Invalid action");

    } catch (error: any) {
        console.error("Video Auth Error:", error);
        return new Response(JSON.stringify({
            error: true,
            message: error.message,
            details: "DEBUG MODE: Returning 200 to see this error body"
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
});
