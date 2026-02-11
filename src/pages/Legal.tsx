import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Shield, Scale, Info } from "lucide-react";

export default function Legal() {
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname.substring(1); // remove leading slash

    const getContent = () => {
        switch (path) {
            case "privacy":
                return {
                    title: "Privacy Policy",
                    icon: <Shield className="w-8 h-8 text-primary" />,
                    content: (
                        <div className="space-y-6 text-muted-foreground leading-relaxed">
                            <p className="text-sm">Last updated: February 11, 2026</p>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">1. Introduction</h3>
                                <p>
                                    Welcome to DartStreak ("we," "our," or "us"). We respect your privacy and are committed to protecting
                                    your personal data. This privacy policy explains how we look after your personal data when you visit
                                    our application and tells you about your privacy rights.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">2. Information We Collect</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>
                                        <span className="text-foreground font-medium">Account Data:</span> When you create an account with
                                        email and password or sign in with Google, we collect your email address and profile details
                                        (such as display name and avatar URL when available) to create your profile.
                                    </li>
                                    <li>
                                        <span className="text-foreground font-medium">Game Data:</span> We store your throw history,
                                        statistics, and league participation data to provide the core functionality of the service.
                                    </li>
                                    <li>
                                        <span className="text-foreground font-medium">Video Data:</span> Some leagues may require video recording for
                                        verification. If a league requires video, short clips are captured and stored securely in our database
                                        and associated with your throw submissions, and they may be viewed by other league members. If a league
                                        does not require video, no recordings are collected for those throws.
                                    </li>
                                </ul>
                                <p className="text-sm">
                                    DartStreak requires a registered account to use the service.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">3. Third-Party Services</h3>
                                <p>We rely on trusted third-party services to operate DartStreak:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><span className="text-foreground font-medium">Supabase:</span> Used for our database, authentication, and secure data storage.</li>
                                    <li><span className="text-foreground font-medium">Google OAuth:</span> Optional sign-in provider for secure authentication.</li>
                                    <li><span className="text-foreground font-medium">Supabase Storage:</span> Used for storing throw verification videos securely.</li>
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">4. Data Deletion</h3>
                                <p>
                                    You have the right to request deletion of your account and all associated data at any time.
                                    You can do this directly within your profile settings or by contacting us at the email below.
                                </p>
                            </section>
                        </div>
                    ),
                };
            case "terms":
                return {
                    title: "Terms of Service",
                    icon: <Scale className="w-8 h-8 text-primary" />,
                    content: (
                        <div className="space-y-6 text-muted-foreground leading-relaxed">
                            <p className="text-sm">Last updated: February 11, 2026</p>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h3>
                                <p>
                                    By accessing or using DartStreak, you agree to be bound by these Terms of Service.
                                    If you do not agree to these terms, please do not use our service.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">2. "As Is" Disclaimer</h3>
                                <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                                    <p className="font-medium text-foreground">
                                        DartStreak is a free, hobbyist project provided "AS IS" and "AS AVAILABLE" without any warranties of any kind,
                                        either express or implied.
                                    </p>
                                    <p className="mt-2 text-sm">
                                        We cannot guarantee that the service will be uninterrupted, secure, or error-free.
                                        We are not liable for any data loss, service interruptions, or issues arising from the use of the service.
                                    </p>
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">3. User Conduct</h3>
                                <p>We value fair play and sportsmanship. By using DartStreak, you agree NOT to:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Cheat, manipulate scores, or use automated bots.</li>
                                    <li>Harass, bully, or use hate speech against other players.</li>
                                    <li>Upload or broadcast inappropriate, offensive, or illegal content.</li>
                                </ul>
                                <p className="mt-2">
                                    We reserve the right to ban any user who violates these rules or disrupts the community.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">4. Intellectual Property</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>
                                        <span className="text-foreground font-medium">Your Content:</span> You retain all ownership rights to the content
                                        you create (e.g., your match history, user profile).
                                    </li>
                                    <li>
                                        <span className="text-foreground font-medium">Our Content:</span> The DartStreak code, design, and logic are
                                        authored by the DartStreak team. However, we make no broad copyright claims over generic game concepts
                                        or darts mechanics.
                                    </li>
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">5. Changes to Terms</h3>
                                <p>
                                    We may update these terms from time to time. We will notify users of significant changes,
                                    but continued use of the service implies acceptance of the new terms.
                                </p>
                            </section>
                        </div>
                    ),
                };
            case "contact":
                return {
                    title: "Contact Us",
                    icon: <Mail className="w-8 h-8 text-primary" />,
                    content: (
                        <div className="space-y-6 text-muted-foreground">
                            <p>Have questions, feedback, or need support? We're here to help!</p>

                            <div className="flex items-center gap-4 p-6 rounded-lg bg-card border border-border shadow-sm">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground text-lg">Email Support</h3>
                                    <p className="text-sm mb-2">For all inquiries, please email us directly:</p>
                                    <a href="mailto:support@dartstreak.com" className="text-primary hover:underline font-medium">
                                        support@dartstreak.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    ),
                };
            default:
                return {
                    title: "Page Not Found",
                    icon: <Info className="w-8 h-8 text-primary" />,
                    content: <p>The page you are looking for does not exist.</p>,
                };
        }
    };

    const { title, icon, content } = getContent();

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-12 max-w-3xl">
                <Button variant="ghost" className="mb-8 pl-0 hover:pl-2 transition-all" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <div className="space-y-8 animate-fade-in">
                    <div className="flex items-center gap-4 border-b border-border pb-6">
                        {icon}
                        <h1 className="text-4xl font-display font-bold">{title}</h1>
                    </div>
                    <div className="prose dark:prose-invert max-w-none">
                        {content}
                    </div>
                </div>
            </div>
        </div>
    );
}
