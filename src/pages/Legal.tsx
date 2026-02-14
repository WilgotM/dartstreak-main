import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Shield, Scale, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Legal() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const path = location.pathname.substring(1); // remove leading slash

    const getContent = () => {
        switch (path) {
            case "privacy":
                return {
                    title: t("legal.privacyPolicy.title"),
                    icon: <Shield className="w-8 h-8 text-primary" />,
                    content: (
                        <div className="space-y-6 text-muted-foreground leading-relaxed">
                            <p className="text-sm">{t("legal.privacyPolicy.p1")}</p>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">{t("legal.privacyPolicy.s1Title")}</h3>
                                <p>
                                    {t("legal.privacyPolicy.s1Text")}
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">{t("legal.privacyPolicy.s2Title")}</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>
                                        <span className="text-foreground font-medium">{t("legal.privacyPolicy.li1")}</span>
                                    </li>
                                    <li>
                                        <span className="text-foreground font-medium">{t("legal.privacyPolicy.li2")}</span>
                                    </li>
                                    <li>
                                        <span className="text-foreground font-medium">{t("legal.privacyPolicy.li3")}</span>
                                    </li>
                                    <li>
                                        <span className="text-foreground font-medium">{t("legal.privacyPolicy.li7")}</span>
                                    </li>
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">{t("legal.privacyPolicy.s3Title")}</h3>
                                <p>{t("legal.privacyPolicy.s3Text")}</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><span className="text-foreground font-medium">{t("legal.privacyPolicy.li4")}</span></li>
                                    <li><span className="text-foreground font-medium">{t("legal.privacyPolicy.li5")}</span></li>
                                    <li><span className="text-foreground font-medium">{t("legal.privacyPolicy.li6")}</span></li>
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">{t("legal.privacyPolicy.s4Title")}</h3>
                                <p>
                                    {t("legal.privacyPolicy.s4Text")}
                                </p>
                            </section>
                        </div>
                    ),
                };
            case "terms":
                return {
                    title: t("legal.terms.title"),
                    icon: <Scale className="w-8 h-8 text-primary" />,
                    content: (
                        <div className="space-y-6 text-muted-foreground leading-relaxed">
                            <p className="text-sm">{t("legal.terms.p1")}</p>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">{t("legal.terms.s1Title")}</h3>
                                <p>
                                    {t("legal.terms.s1Text")}
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">{t("legal.terms.s2Title")}</h3>
                                <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                                    <p className="font-medium text-foreground">
                                        {t("legal.terms.s2Text1")}
                                    </p>
                                    <p className="mt-2 text-sm">
                                        {t("legal.terms.s2Text2")}
                                    </p>
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">{t("legal.terms.s3Title")}</h3>
                                <p>{t("legal.terms.s3Text")}</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>{t("legal.terms.li1")}</li>
                                    <li>{t("legal.terms.li2")}</li>
                                    <li>{t("legal.terms.li3")}</li>
                                </ul>
                                <p className="mt-2">
                                    {t("legal.terms.s3Text2")}
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">{t("legal.terms.s4Title")}</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>
                                        <span className="text-foreground font-medium">{t("legal.terms.li4")}</span>
                                    </li>
                                    <li>
                                        <span className="text-foreground font-medium">{t("legal.terms.li5")}</span>
                                    </li>
                                </ul>
                            </section>
                        </div>
                    ),
                };
            case "contact":
                return {
                    title: t("legal.contact.title"),
                    icon: <Mail className="w-8 h-8 text-primary" />,
                    content: (
                        <div className="space-y-6 text-muted-foreground">
                            <p>{t("legal.contact.p1")}</p>

                            <div className="flex items-center gap-4 p-6 rounded-lg bg-card border border-border shadow-sm">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground text-lg">{t("legal.contact.emailSupport")}</h3>
                                    <p className="text-sm mb-2">{t("legal.contact.p2")}</p>
                                    <a href="mailto:dartstreak@proton.me" className="text-primary hover:underline font-medium">
                                        dartstreak@proton.me
                                    </a>
                                </div>
                            </div>
                        </div>
                    ),
                };
            default:
                return {
                    title: t("legal.notFound.title"),
                    icon: <Info className="w-8 h-8 text-primary" />,
                    content: <p>{t("legal.notFound.text")}</p>,
                };
        }
    };

    const { title, icon, content } = getContent();

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-12 max-w-3xl">
                <Button variant="ghost" className="mb-8 pl-0 hover:pl-2 transition-all" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t("common.back")}
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
