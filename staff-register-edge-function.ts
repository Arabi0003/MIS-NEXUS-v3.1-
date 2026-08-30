import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/*
============================================================
 MIS-NEXUS STAFF REGISTRATION EDGE FUNCTION
============================================================

Function name:

    mis-nexus-staff-registration

Endpoints:

    GET
    /functions/v1/mis-nexus-staff-registration?action=roles

    POST
    /functions/v1/mis-nexus-staff-registration

Purpose:

    1. Load active school roles.
    2. Create a new Supabase Auth account automatically.
    3. Create a separate staff profile.
    4. Store the attendance passcode securely.
    5. Never replace an existing staff profile.
    6. Work with the existing MIS-NEXUS staff database.

IMPORTANT:

    The secret/service key stays ONLY inside this Edge Function.
    NEVER place it inside HTML or browser JavaScript.
============================================================
*/


/* =========================================================
   ENVIRONMENT
========================================================= */

const SUPABASE_URL =
    Deno.env.get("SUPABASE_URL") ?? "";


/*
Supabase currently provides secret keys through
SUPABASE_SECRET_KEYS.

For compatibility with older Supabase projects we also
support SUPABASE_SERVICE_ROLE_KEY.
*/

function getSecretKey(): string {

    const secretKeysRaw =
        Deno.env.get("SUPABASE_SECRET_KEYS");

    if (secretKeysRaw) {

        try {

            const parsed =
                JSON.parse(secretKeysRaw);

            if (
                parsed &&
                typeof parsed.default === "string" &&
                parsed.default.length > 0
            ) {
                return parsed.default;
            }

        } catch {
            // Continue to legacy variable.
        }
    }


    const legacy =
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (legacy) {
        return legacy;
    }


    throw new Error(
        "No Supabase secret key is available to the Edge Function."
    );
}


const SUPABASE_SECRET_KEY =
    getSecretKey();


/*
Admin client.

This client bypasses RLS and MUST remain server-side.
*/

const supabaseAdmin =
    createClient(
        SUPABASE_URL,
        SUPABASE_SECRET_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );


/* =========================================================
   CORS
========================================================= */

const corsHeaders = {

    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",

    "Content-Type":
        "application/json; charset=utf-8"
};


/* =========================================================
   RESPONSE HELPERS
========================================================= */

function json(
    body: unknown,
    status = 200
): Response {

    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: corsHeaders
        }
    );
}


function errorResponse(
    message: string,
    status = 400,
    extra: Record<string, unknown> = {}
): Response {

    return json(
        {
            success: false,
            error: message,
            ...extra
        },
        status
    );
}


/* =========================================================
   TEXT HELPERS
========================================================= */

function clean(
    value: unknown
): string {

    if (
        typeof value !== "string"
    ) {
        return "";
    }

    return value
        .trim()
        .replace(/\s+/g, " ");
}


function nullable(
    value: unknown
): string | null {

    const valueClean =
        clean(value);

    return valueClean
        ? valueClean
        : null;
}


/* =========================================================
   EMAIL VALIDATION
========================================================= */

function validEmail(
    email: string
): boolean {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);
}


/* =========================================================
   PASSWORD VALIDATION
========================================================= */

function validPassword(
    password: string
): boolean {

    return (
        password.length >= 8 &&
        password.length <= 128
    );
}


/* =========================================================
   ATTENDANCE PASSCODE
========================================================= */

function validPasscode(
    passcode: string
): boolean {

    return /^\d{6}$/.test(passcode);
}


/*
We use Web Crypto instead of pgcrypto functions such as
gen_salt().

This prevents the:

    function gen_salt(unknown, integer) does not exist

problem you encountered previously.
*/

function bytesToHex(
    bytes: Uint8Array
): string {

    return Array.from(bytes)
        .map(
            byte =>
                byte.toString(16)
                    .padStart(2, "0")
        )
        .join("");
}


function generateSalt(
    length = 16
): string {

    const bytes =
        new Uint8Array(length);

    crypto.getRandomValues(bytes);

    return bytesToHex(bytes);
}


async function sha256(
    value: string
): Promise<string> {

    const encoder =
        new TextEncoder();

    const data =
        encoder.encode(value);

    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );

    return bytesToHex(
        new Uint8Array(digest)
    );
}


async function hashPasscode(
    passcode: string
): Promise<{
    hash: string;
    salt: string;
}> {

    const salt =
        generateSalt();

    const hash =
        await sha256(
            `${salt}:${passcode}`
        );

    return {
        hash,
        salt
    };
}


/* =========================================================
   ROLE LOADING
========================================================= */

async function loadRoles(): Promise<Response> {

    const {
        data,
        error
    } =
        await supabaseAdmin
            .from(
                "mis_nexus_staff_roles"
            )
            .select(
                "id,role_name,role_description,is_active"
            )
            .eq(
                "is_active",
                true
            )
            .order(
                "role_name",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "ROLE LOAD ERROR:",
            error
        );

        return errorResponse(
            "Unable to load school roles.",
            500,
            {
                code:
                    error.code ?? null,

                details:
                    error.message ?? null
            }
        );
    }


    return json(
        {
            success: true,

            roles:
                data ?? []
        }
    );
}


/* =========================================================
   CHECK EMAIL
========================================================= */

async function emailAlreadyExists(
    email: string
): Promise<boolean> {

    /*
    First check the staff profile table.

    This protects the staff side even if the Auth system
    contains unusual duplicate states.
    */

    const {
        data,
        error
    } =
        await supabaseAdmin
            .from(
                "mis_nexus_staff_profiles"
            )
            .select(
                "id"
            )
            .ilike(
                "email",
                email
            )
            .limit(1);


    if (error) {

        console.error(
            "EMAIL PROFILE CHECK ERROR:",
            error
        );

        throw new Error(
            "Unable to verify whether this email already belongs to a staff member."
        );
    }


    return Boolean(
        data &&
        data.length > 0
    );
}


/* =========================================================
   CHECK STAFF NUMBER
========================================================= */

async function staffNumberExists(
    staffNumber: string
): Promise<boolean> {

    if (!staffNumber) {
        return false;
    }


    const {
        data,
        error
    } =
        await supabaseAdmin
            .from(
                "mis_nexus_staff_profiles"
            )
            .select(
                "id"
            )
            .eq(
                "staff_number",
                staffNumber
            )
            .limit(1);


    if (error) {

        console.error(
            "STAFF NUMBER CHECK ERROR:",
            error
        );

        throw new Error(
            "Unable to verify the staff number."
        );
    }


    return Boolean(
        data &&
        data.length > 0
    );
}


/* =========================================================
   VERIFY ROLE
========================================================= */

async function roleExists(
    roleName: string
): Promise<boolean> {

    const {
        data,
        error
    } =
        await supabaseAdmin
            .from(
                "mis_nexus_staff_roles"
            )
            .select(
                "id"
            )
            .eq(
                "role_name",
                roleName
            )
            .eq(
                "is_active",
                true
            )
            .limit(1);


    if (error) {

        console.error(
            "ROLE VERIFY ERROR:",
            error
        );

        throw new Error(
            "Unable to verify the selected school role."
        );
    }


    return Boolean(
        data &&
        data.length > 0
    );
}


/* =========================================================
   CREATE STAFF
========================================================= */

async function createStaff(
    payload: Record<string, unknown>
): Promise<Response> {


    /* ------------------------------------------------------
       READ INPUT
    ------------------------------------------------------ */

    const firstName =
        clean(
            payload.first_name
        );

    const middleName =
        nullable(
            payload.middle_name
        );

    const lastName =
        clean(
            payload.last_name
        );

    const staffNumber =
        nullable(
            payload.staff_number
        );

    const email =
        clean(
            payload.email
        ).toLowerCase();

    const phone =
        nullable(
            payload.phone
        );

    const role =
        clean(
            payload.role
        );

    const department =
        nullable(
            payload.department
        );

    const gender =
        nullable(
            payload.gender
        );

    const employmentType =
        nullable(
            payload.employment_type
        );

    const dateJoined =
        nullable(
            payload.date_joined
        );

    const password =
        typeof payload.password === "string"
            ? payload.password
            : "";

    const attendancePasscode =
        typeof payload.attendance_passcode === "string"
            ? payload.attendance_passcode
            : "";

    const address =
        nullable(
            payload.address
        );

    const biography =
        nullable(
            payload.biography
        );


    /* ------------------------------------------------------
       REQUIRED FIELD VALIDATION
    ------------------------------------------------------ */

    if (!firstName) {

        return errorResponse(
            "First name is required."
        );
    }


    if (!lastName) {

        return errorResponse(
            "Last name is required."
        );
    }


    if (!validEmail(email)) {

        return errorResponse(
            "Please provide a valid staff email address."
        );
    }


    if (!role) {

        return errorResponse(
            "Please select a school role."
        );
    }


    if (!validPassword(password)) {

        return errorResponse(
            "The login password must contain between 8 and 128 characters."
        );
    }


    if (!validPasscode(attendancePasscode)) {

        return errorResponse(
            "The attendance passcode must contain exactly six digits."
        );
    }


    /* ------------------------------------------------------
       ENUM VALIDATION
    ------------------------------------------------------ */

    const allowedGender = [
        "male",
        "female",
        "other"
    ];

    if (
        gender &&
        !allowedGender.includes(
            gender
        )
    ) {

        return errorResponse(
            "Invalid gender selected."
        );
    }


    const allowedEmploymentTypes = [
        "full_time",
        "part_time",
        "contract",
        "temporary",
        "intern",
        "volunteer",
        "other"
    ];

    if (
        employmentType &&
        !allowedEmploymentTypes.includes(
            employmentType
        )
    ) {

        return errorResponse(
            "Invalid employment type selected."
        );
    }


    /* ------------------------------------------------------
       ROLE VERIFICATION
    ------------------------------------------------------ */

    if (
        !(await roleExists(role))
    ) {

        return errorResponse(
            "The selected school role is not active or does not exist."
        );
    }


    /* ------------------------------------------------------
       DUPLICATE EMAIL CHECK
    ------------------------------------------------------ */

    if (
        await emailAlreadyExists(
            email
        )
    ) {

        return errorResponse(
            "This email is already registered as a staff profile. Please use the existing staff login."
        );
    }


    /* ------------------------------------------------------
       DUPLICATE STAFF NUMBER CHECK
    ------------------------------------------------------ */

    if (
        staffNumber &&
        await staffNumberExists(
            staffNumber
        )
    ) {

        return errorResponse(
            "This staff number is already assigned to another staff member."
        );
    }


    /* ------------------------------------------------------
       HASH ATTENDANCE PASSCODE
    ------------------------------------------------------ */

    const {
        hash:
            passcodeHash,

        salt:
            passcodeSalt

    } =
        await hashPasscode(
            attendancePasscode
        );


    /* ------------------------------------------------------
       CREATE AUTH USER
    ------------------------------------------------------ */

    let authUserId:
        string | null = null;


    const {
        data:
            authData,

        error:
            authError

    } =
        await supabaseAdmin
            .auth
            .admin
            .createUser({

                email,

                password,

                email_confirm: true,

                user_metadata: {

                    first_name:
                        firstName,

                    middle_name:
                        middleName,

                    last_name:
                        lastName,

                    full_name:
                        [
                            firstName,
                            middleName,
                            lastName
                        ]
                        .filter(Boolean)
                        .join(" "),

                    role,

                    staff_number:
                        staffNumber
                }
            });


    if (authError) {

        console.error(
            "AUTH CREATE ERROR:",
            authError
        );


        const message =
            authError.message ||
            "";


        if (
            /already|exists|duplicate/i
                .test(message)
        ) {

            return errorResponse(
                "This email already has a login account. Use another email or use the existing Staff Login.",
                409
            );
        }


        return errorResponse(
            "Unable to create the staff login account.",
            500,
            {
                details:
                    message
            }
        );
    }


    if (
        !authData ||
        !authData.user
    ) {

        return errorResponse(
            "Supabase did not return the newly created staff account.",
            500
        );
    }


    authUserId =
        authData.user.id;


    /* ------------------------------------------------------
       CREATE STAFF PROFILE
    ------------------------------------------------------ */

    const fullName =
        [
            firstName,
            middleName,
            lastName
        ]
        .filter(Boolean)
        .join(" ");


    const profileRow = {

        auth_user_id:
            authUserId,

        staff_number:
            staffNumber,

        email,

        first_name:
            firstName,

        middle_name:
            middleName,

        last_name:
            lastName,

        full_name:
            fullName,

        gender,

        phone,

        role,

        department,

        employment_type:
            employmentType,

        employment_status:
            "active",

        date_joined:
            dateJoined,

        address,

        biography,

        is_attendance_enabled:
            true,

        /*
        These columns are expected by the upgraded
        attendance-passcode system.

        If your existing table does not yet have them,
        see the optional SQL section below.
        */

        attendance_passcode_hash:
            passcodeHash,

        attendance_passcode_salt:
            passcodeSalt
    };


    const {
        data:
            profileData,

        error:
            profileError

    } =
        await supabaseAdmin
            .from(
                "mis_nexus_staff_profiles"
            )
            .insert(
                profileRow
            )
            .select(
                "id,auth_user_id,email,first_name,middle_name,last_name,full_name,role,department,employment_status,is_attendance_enabled"
            )
            .single();


    /* ------------------------------------------------------
       COMPENSATION
    ------------------------------------------------------ */

    if (profileError) {

        console.error(
            "PROFILE CREATE ERROR:",
            profileError
        );


        /*
        IMPORTANT:

        Auth user was created but profile creation failed.

        Remove only the newly-created Auth user.

        This prevents orphan Auth accounts.
        */

        if (authUserId) {

            const {
                error:
                    deleteError
            } =
                await supabaseAdmin
                    .auth
                    .admin
                    .deleteUser(
                        authUserId
                    );


            if (deleteError) {

                console.error(
                    "AUTH ROLLBACK ERROR:",
                    deleteError
                );
            }
        }


        /*
        PostgreSQL unique constraint.
        */

        if (
            profileError.code === "23505"
        ) {

            return errorResponse(
                "This staff profile already exists. No existing staff member was replaced.",
                409
            );
        }


        return errorResponse(
            "The staff login was created temporarily, but the staff profile could not be created. The system attempted to safely roll back the new login.",
            500,
            {
                details:
                    profileError.message
            }
        );
    }


    /* ------------------------------------------------------
       SUCCESS
    ------------------------------------------------------ */

    return json(
        {
            success: true,

            message:
                "Staff account created successfully. The staff member can now use the Staff Login page with this email and login password, and use the six-digit attendance passcode inside the attendance dashboard.",

            staff:
                profileData
        },
        201
    );
}


/* =========================================================
   MAIN REQUEST HANDLER
========================================================= */

Deno.serve(
    async (
        req: Request
    ): Promise<Response> => {

        /* --------------------------------------------------
           CORS PREFLIGHT
        -------------------------------------------------- */

        if (
            req.method === "OPTIONS"
        ) {

            return new Response(
                null,
                {
                    status: 204,
                    headers: corsHeaders
                }
            );
        }


        try {

            const url =
                new URL(
                    req.url
                );


            /* ----------------------------------------------
               HEALTH CHECK
            ---------------------------------------------- */

            if (
                req.method === "GET" &&
                url.searchParams.get("action") === "health"
            ) {

                return json(
                    {
                        success: true,

                        service:
                            "mis-nexus-staff-registration",

                        status:
                            "online",

                        timestamp:
                            new Date()
                                .toISOString()
                    }
                );
            }


            /* ----------------------------------------------
               LOAD ROLES
            ---------------------------------------------- */

            if (
                req.method === "GET" &&
                url.searchParams.get("action") === "roles"
            ) {

                return await loadRoles();
            }


            /* ----------------------------------------------
               ONLY POST FOR REGISTRATION
            ---------------------------------------------- */

            if (
                req.method !== "POST"
            ) {

                return errorResponse(
                    "Method not allowed.",
                    405
                );
            }


            /* ----------------------------------------------
               JSON BODY
            ---------------------------------------------- */

            let payload:
                Record<string, unknown>;


            try {

                payload =
                    await req.json();

            } catch {

                return errorResponse(
                    "Invalid JSON request.",
                    400
                );
            }


            if (
                !payload ||
                typeof payload !== "object"
            ) {

                return errorResponse(
                    "Invalid registration request.",
                    400
                );
            }


            return await createStaff(
                payload
            );


        } catch (error) {

            console.error(
                "MIS-NEXUS EDGE FUNCTION ERROR:",
                error
            );


            return errorResponse(
                error instanceof Error
                    ? error.message
                    : "Unexpected server error.",
                500
            );
        }
    }
);