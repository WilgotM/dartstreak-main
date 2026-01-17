import { useParams, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";

export default function Legal() {
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname.substring(1); // remove leading slash

    const getContent = () => {
        switch (path) {
            case "privacy":
                return {
                    title: "Privacy Policy",
                    content: (
                        <div className="space-y-4 text-muted-foreground">
                            <p>Last updated: January 2026</p>
                            <h3 className="text-lg font-semibold text-foreground">1. Introduction</h3>
                            <p>Welcome to DartStreak. We respect your privacy and are committed to protecting your personal data.</p>
                            <h3 className="text-lg font-semibold text-foreground">2. Data We Collect</h3>
                            <p>We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us.</p>
                            <h3 className="text-lg font-semibold text-foreground">3. How We Use Your Data</h3>
                            <p>We use your data to provide, maintain, and improve our services, including processing your matches and tournaments.</p>
                        </div>
                    ),
                };
            case "terms":
                return {
                    title: "Terms of Service",
                    content: (
                        <div className="space-y-4 text-muted-foreground">
                            <p>Last updated: January 2026</p>
                            <h3 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h3>
                            <p>By accessing or using DartStreak, you agree to be bound by these Terms of Service.</p>
                            <h3 className="text-lg font-semibold text-foreground">2. User Accounts</h3>
                            <p>You are responsible for safeguarding your account login credentials and for any activities or actions under your account.</p>
                            <h3 className="text-lg font-semibold text-foreground">3. Conduct</h3>
                            <p>You agree not to misuse the services or help anyone else do so.</p>
                        </div>
                    ),
                };
            case "contact":
                return {
                    title: "Contact Us",
                    content: (
                        <div className="space-y-6 text-muted-foreground">
                            <p>Have questions, feedback, or need support? We're here to help!</p>

                            <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Email Support</h3>
                                    <a href="mailto:support@dartstreak.com" className="text-primary hover:underline">
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
                    content: <p>The page you are looking for does not exist.</p>,
                };
        }
    };

    const { title, content } = getContent();

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <div className="space-y-6 animate-fade-in">
                    <h1 className="text-4xl font-display font-bold">{title}</h1>
                    <div className="prose dark:prose-invert max-w-none">
                        {content}
                    </div>
                </div>
            </div>
        </div>
    );
}
