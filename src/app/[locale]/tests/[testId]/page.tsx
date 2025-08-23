"use client";

import Link from "next/link";
import { useTranslation } from "@/components/providers/translation-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { getTestById, TestQuestion, TestDefinition, personalizeQuestions, getFeedback360TestDefinition } from "@/lib/test-definitions";
import { saveTestResult, sendFeedbackInvitations, sendCoupleCompatibilityInvitation, sendCoupleCompatibilityResults } from "@/lib/firestore";
import EmailSignup from "@/components/EmailSignup";

export default function TestPage() {
    const { t, currentLanguage } = useTranslation();
    const { user, loading: authLoading } = useAuth();
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const testId = params.testId as string;
    
    // Check if this is an invitation link
    const invitationId = searchParams.get('invitation');
    const partnerName = searchParams.get('partner');
    const originalTestResultId = searchParams.get('testResultId');
    const isInvitationAccess = Boolean(invitationId && testId === 'couple-compatibility');
    
    // Check if this is a protected test (but couple compatibility allows invitation access)
    const isProtectedTest = (testId === 'couple-compatibility' && !isInvitationAccess) || testId === 'feedback-360';
    const [authChecked, setAuthChecked] = useState(false);
    
    // Force client-side rendering for feedback-360 to ensure auth check runs
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
    }, []);
    
    console.log('TestPage mounted with params:', params);
    console.log('testId extracted:', testId);

    const [testDefinition, setTestDefinition] = useState<TestDefinition | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
    const [testCompleted, setTestCompleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testResultId, setTestResultId] = useState<string | null>(null);
    const [feedbackEmails, setFeedbackEmails] = useState<string[]>(['']);
    const [userName, setUserName] = useState<string>('');
    const [nameInputValue, setNameInputValue] = useState<string>('');
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [completedTestResult, setCompletedTestResult] = useState<any>(null);
    const [hasInProgressTest, setHasInProgressTest] = useState(false);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [showNameInput, setShowNameInput] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [showCategorySelection, setShowCategorySelection] = useState(false);

    // Generate unique progress key for this test session
    const getProgressKey = () => `test_progress_${testId}_${user?.uid || 'anonymous'}`;
    
    // Save test progress to localStorage
    const saveTestProgress = (questionIndex: number, currentAnswers: { [questionId: string]: any }) => {
        const progressData = {
            testId,
            questionIndex,
            answers: currentAnswers,
            timestamp: new Date().toISOString(),
            totalQuestions: testDefinition?.questions.length || 0
        };
        
        try {
            localStorage.setItem(getProgressKey(), JSON.stringify(progressData));
            console.log(`Progress saved: Question ${questionIndex + 1}/${testDefinition?.questions.length || 0}`);
        } catch (error) {
            console.error('Error saving test progress:', error);
        }
    };
    
    // Load saved test progress from localStorage
    const loadTestProgress = () => {
        try {
            const savedProgress = localStorage.getItem(getProgressKey());
            if (savedProgress) {
                const progressData = JSON.parse(savedProgress);
                
                // Validate the saved data
                if (progressData.testId === testId && progressData.answers) {
                    return {
                        questionIndex: progressData.questionIndex || 0,
                        answers: progressData.answers || {},
                        timestamp: progressData.timestamp,
                        totalQuestions: progressData.totalQuestions
                    };
                }
            }
        } catch (error) {
            console.error('Error loading test progress:', error);
        }
        return null;
    };
    
    // Format name based on cultural context
    const getFormattedName = (inputName: string) => {
        if (!inputName.trim()) return '';
        
        const name = inputName.trim();
        
        switch (currentLanguage) {
            case 'ko':
                // Korean: Add 님 honorific if not already present
                return name.endsWith('님') ? name : `${name}님`;
            case 'ja':
                // Japanese: Add さん honorific if not already present
                return name.endsWith('さん') || name.endsWith('様') || name.endsWith('君') || name.endsWith('ちゃん') ? 
                       name : `${name}さん`;
            case 'zh':
                // Chinese: Use name as-is (cultural context varies)
                return name;
            default:
                // Western: Use first name only if full name provided
                const nameParts = name.split(' ');
                return nameParts[0];
        }
    };

    // Format name from separate first/last name parts
    const getFormattedNameFromParts = (lastNamePart: string, firstNamePart: string) => {
        if (!lastNamePart.trim() && !firstNamePart.trim()) return '';
        
        const cleanLast = lastNamePart.trim();
        const cleanFirst = firstNamePart.trim();
        
        switch (currentLanguage) {
            case 'ko':
            case 'ja':
            case 'zh':
                // Asian names: Last name + First name
                const fullName = cleanLast + cleanFirst;
                return getFormattedName(fullName);
            default:
                // Western names: Use first name only
                return cleanFirst || cleanLast;
        }
    };

    // Clear saved test progress
    const clearTestProgress = () => {
        try {
            localStorage.removeItem(getProgressKey());
            console.log('Test progress cleared');
        } catch (error) {
            console.error('Error clearing test progress:', error);
        }
    };
    
    // Resume from saved progress
    const resumeFromProgress = () => {
        const savedProgress = loadTestProgress();
        if (savedProgress) {
            setCurrentQuestionIndex(savedProgress.questionIndex);
            setAnswers(savedProgress.answers);
            setHasInProgressTest(false);
            setShowResumePrompt(false);
            console.log(`Resumed from question ${savedProgress.questionIndex + 1}`);
        }
    };
    
    // Start fresh test
    const startFreshTest = () => {
        clearTestProgress();
        setCurrentQuestionIndex(0);
        setAnswers({});
        setHasInProgressTest(false);
        setShowResumePrompt(false);
        console.log('Started fresh test');
    };

    // Load test definition and check for saved progress
    useEffect(() => {
        // Only run authentication check on client-side
        if (!isClient) {
            console.log('⏳ Waiting for client-side rendering...');
            return;
        }
        
        // Authentication check for protected tests
        console.log('Authentication check:', { testId, authLoading, hasUser: !!user, isClient });
        
        // For protected tests, require authentication first (unless it's invitation access)
        // Wait for auth loading to complete before checking authentication
        if (isProtectedTest && !authLoading && !user) {
            console.log(`🔐 ${testId} requires authentication - redirecting to login`);
            
            // Store return URL and context in localStorage (same pattern as 360 feedback)
            const returnUrl = `/${currentLanguage}/tests/${testId}${isInvitationAccess ? '?' + searchParams.toString() : ''}`;
            const context = testId === 'feedback-360' ? 'feedback-360-test' : 'couple-compatibility-test';
            
            localStorage.setItem('auth_return_url', returnUrl);
            localStorage.setItem('auth_return_context', context);
            
            router.push(`/${currentLanguage}/auth?returnUrl=${encodeURIComponent(returnUrl)}&context=${context}`);
            return;
        }
        
        // Skip loading test definition while auth is still loading for protected tests
        if (isProtectedTest && authLoading) {
            console.log('⏳ Waiting for authentication to complete...');
            return;
        }
        
        // If we reach here for protected tests, user must be authenticated (or it's invitation access)
        if ((testId === 'feedback-360' || (testId === 'couple-compatibility' && !isInvitationAccess)) && user) {
            console.log(`✅ User authenticated, proceeding with ${testId} test`);
        }
        
        // For invitation access, show welcome message
        if (isInvitationAccess && partnerName) {
            console.log(`✅ Partner invitation access: ${partnerName} invited to couple compatibility test`);
        }
        
        // For feedback-360 test, handle category selection first
        let definition: TestDefinition | null = null;
        
        console.log('useEffect running with testId:', testId);
        console.log('Current testDefinition:', testDefinition?.id);
        console.log('selectedCategory:', selectedCategory);
        console.log('showCategorySelection:', showCategorySelection);
        
        if (testId === 'feedback-360') {
            console.log('Detected feedback-360 test');
            if (!selectedCategory) {
                console.log('No category selected - showing category selection');
                setShowCategorySelection(true);
                setLoading(false);
                return;
            }
            
            // Hide category selection once a category is selected
            if (showCategorySelection) {
                console.log('Category selected, hiding category selection UI');
                setShowCategorySelection(false);
            }
            
            // Generate test definition based on selected category
            console.log('Generating feedback360 definition for category:', selectedCategory);
            try {
                definition = getFeedback360TestDefinition(selectedCategory);
                console.log('Generated definition:', definition ? 'SUCCESS' : 'FAILED');
                console.log('Definition ID:', definition?.id);
                console.log('Questions count:', definition?.questions?.length);
            } catch (error) {
                console.error('Error generating feedback360 definition:', error);
                definition = null;
            }
            
            // Set the test definition
            if (definition) {
                const expectedId = `feedback-360-${selectedCategory}`;
                if (testDefinition?.id !== expectedId) {
                    console.log('Setting new testDefinition:', expectedId);
                    setTestDefinition(definition);
                } else {
                    console.log('TestDefinition already set, using existing');
                    definition = testDefinition;
                }
            }
        } else {
            definition = getTestById(testId) || null;
            
            if (definition && testDefinition?.id !== definition.id) {
                console.log('Setting testDefinition for:', definition.id);
                setTestDefinition(definition);
            } else if (definition) {
                console.log('TestDefinition already set, using existing');
                definition = testDefinition;
            } else {
                console.error('CRITICAL: No test definition found for testId:', testId);
            }
        }
        
        // Check for saved progress only after test definition is set
        if (definition) {
            const savedProgress = loadTestProgress();
            if (savedProgress && Object.keys(savedProgress.answers).length > 0) {
                setHasInProgressTest(true);
                setShowResumePrompt(true);
                console.log(`Found saved progress: ${Object.keys(savedProgress.answers).length} answers, question ${savedProgress.questionIndex + 1}`);
            }
            
            // For 360-degree test, show name input after category selection
            if (testId === 'feedback-360' && !userName && !hasInProgressTest) {
                console.log('Setting showNameInput to true for 360-degree test');
                setShowNameInput(true);
            } else {
                console.log('Name input conditions:', { testId, userName, hasInProgressTest });
            }
            
            setLoading(false);
        } else if (testId === 'feedback-360' && !selectedCategory) {
            // Don't redirect if we're still in category selection phase
            console.log('Feedback-360 test without category - staying on category selection');
            setLoading(false);
        } else {
            console.error(`Test ${testId} not found - redirecting to tests page`);
            console.error('Debug info:', { testId, selectedCategory, definition });
            router.push(`/${currentLanguage}/tests`);
        }
    }, [testId, selectedCategory, currentLanguage, authLoading, user, isClient]);

    const handleAnswer = (answer: any) => {
        const currentQuestion = testDefinition?.questions[currentQuestionIndex];
        if (!currentQuestion) return;

        const newAnswers = {
            ...answers,
            [currentQuestion.id]: answer
        };
        setAnswers(newAnswers);

        if (currentQuestionIndex < testDefinition.questions.length - 1) {
            const nextQuestionIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextQuestionIndex);
            
            // Save progress after each answer
            saveTestProgress(nextQuestionIndex, newAnswers);
        } else {
            // End of the test - clear progress as test is complete
            clearTestProgress();
            processTestCompletion(newAnswers);
        }
    };

    const calculateCoupleCompatibility = (result1: any, result2: any, answers1: any, answers2: any) => {
        try {
            // Use the couple compatibility scoring function from test-definitions
            if (testDefinition && testDefinition.scoring) {
                // Calculate compatibility between the two sets of answers
                // The scoring function expects (answers, partnerAnswers)
                const compatibilityData = testDefinition.scoring(answers1, answers2);
                
                return {
                    compatibilityPercentage: compatibilityData.scores?.compatibility || 75,
                    partner1: result1,
                    partner2: result2,
                    areas: compatibilityData.areas || {},
                    description: compatibilityData.description || 'Good compatibility!',
                    recommendations: compatibilityData.recommendations || []
                };
            }
        } catch (error) {
            console.error('Error calculating couple compatibility:', error);
        }
        
        // Fallback simple compatibility calculation
        return {
            compatibilityPercentage: 75,
            partner1: result1,
            partner2: result2,
            areas: {
                communication: 80,
                lifestyle: 70,
                values: 75
            },
            description: 'You have good compatibility potential!',
            recommendations: ['Continue communicating openly', 'Explore shared interests']
        };
    };

    const sendCoupleResults = async (coupleCompatibility: any, result1: any, result2: any, partnerName: string, partnerEmail: string) => {
        try {
            console.log('Sending couple results email...', { coupleCompatibility, partnerName, partnerEmail });
            
            // Log the results for debugging
            console.log('Couple Compatibility Results:', {
                compatibility: coupleCompatibility.compatibilityPercentage + '%',
                partner1Type: result1.type,
                partner2Type: result2.type,
                areas: coupleCompatibility.areas,
                description: coupleCompatibility.description
            });
            
            // Get original partner email from search params or use fallback
            const originalPartnerEmail = 'bill@example.com'; // This should come from stored invitation data
            
            // Try to send actual email results using the new function
            const emailResult = await sendCoupleCompatibilityResults(
                coupleCompatibility,
                originalPartnerEmail, // Partner 1 (original test taker)
                partnerEmail, // Partner 2 (current test taker)  
                partnerName, // Partner 1 name
                'Partner', // Partner 2 name (we don't have this, use generic)
                currentLanguage
            );
            
            if (emailResult.success) {
                alert(currentLanguage === 'ko' ? 
                    `커플 호환성 결과: ${coupleCompatibility.compatibilityPercentage}%!\n\n양쪽 모두에게 결과 이메일이 전송되었습니다.` :
                    `Couple Compatibility: ${coupleCompatibility.compatibilityPercentage}%!\n\nResults email sent to both partners.`
                );
            } else {
                // Fallback to showing results locally
                alert(currentLanguage === 'ko' ? 
                    `커플 호환성 결과: ${coupleCompatibility.compatibilityPercentage}%!\n\n이메일 전송 실패 - 콘솔에서 결과 확인하세요.` :
                    `Couple Compatibility: ${coupleCompatibility.compatibilityPercentage}%!\n\nEmail failed - check console for results.`
                );
            }
            
        } catch (error) {
            console.error('Error sending couple results:', error);
            alert(currentLanguage === 'ko' ? 
                `커플 호환성 결과 계산됨! 콘솔에서 결과를 확인하세요.` :
                `Couple compatibility calculated! Check console for results.`
            );
        }
    };

    const handlePartnerCompletion = async (partnerResult: any, partnerAnswers: { [questionId: string]: any }) => {
        try {
            console.log('Handling partner completion:', { partnerResult, originalTestResultId, partnerName });
            
            // Try to retrieve original partner's results from localStorage
            let originalResult = null;
            if (originalTestResultId) {
                const storedResult = localStorage.getItem(`test_result_${originalTestResultId}`);
                if (storedResult) {
                    originalResult = JSON.parse(storedResult);
                    console.log('Found original result in localStorage:', originalResult);
                }
            }
            
            if (!originalResult) {
                console.warn('Could not find original partner result - sending individual results only');
                return;
            }
            
            // Calculate couple compatibility using both results
            const coupleCompatibility = calculateCoupleCompatibility(
                originalResult.result, 
                partnerResult,
                originalResult.answers,
                partnerAnswers
            );
            
            console.log('Calculated couple compatibility:', coupleCompatibility);
            
            // Send results email to both partners (if email service is available)
            await sendCoupleResults(
                coupleCompatibility,
                originalResult.result,
                partnerResult,
                partnerName || 'Your Partner',
                searchParams.get('email') || 'partner@example.com'
            );
            
        } catch (error) {
            console.error('Error handling partner completion:', error);
        }
    };

    const processTestCompletion = async (finalAnswers: { [questionId: string]: any }) => {
        if (!testDefinition) {
            console.error("Test definition must be available");
            return;
        }

        setSaving(true);
        try {
            // Score the test
            const testResult = testDefinition.scoring(finalAnswers);
            
            // Store the result for display
            setCompletedTestResult(testResult);
            
            // Save to local storage for anonymous users
            const localResult = {
                testId,
                answers: finalAnswers,
                result: testResult,
                completedAt: new Date().toISOString()
            };
            
            let resultId = 'local_' + Date.now();
            
            // Always save to localStorage as fallback (for static deployment)
            localStorage.setItem(`test_result_${resultId}`, JSON.stringify(localResult));
            console.log("Test saved to localStorage for fallback access");
            
            // If user is logged in, also save to Firestore
            if (user) {
                try {
                    const firestoreResultId = await saveTestResult(
                        user.uid,
                        testId,
                        localResult,
                        false
                    );
                    console.log("Test saved to Firestore successfully with ID:", firestoreResultId);
                    
                    // Update the resultId to use Firestore ID for consistency
                    resultId = firestoreResultId;
                    
                    // Re-save to localStorage with Firestore ID for consistency
                    localStorage.setItem(`test_result_${firestoreResultId}`, JSON.stringify(localResult));
                    console.log("Test also saved to localStorage with Firestore ID for consistency");
                } catch (error) {
                    console.error("Error saving to Firestore, using local storage only:", error);
                }
            } else {
                console.log("Anonymous user - using localStorage only");
            }

            setTestResultId(resultId);
            
            // Handle partner completion for couple compatibility
            if (isInvitationAccess && testId === 'couple-compatibility' && partnerName) {
                await handlePartnerCompletion(testResult, finalAnswers);
            }
            
            setTestCompleted(true);
            console.log("Test completed successfully!");
        } catch (error) {
            console.error("Error processing test completion:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleSendCoupleCompatibilityInvitation = async () => {
        if (!testResultId) {
            alert(currentLanguage === 'ko' ? '먼저 테스트를 완료해주세요.' : 'Please complete the test first.');
            return;
        }

        if (!userName.trim()) {
            alert(currentLanguage === 'ko' ? 
                '파트너가 누구에 대한 호환성 테스트를 하는지 알 수 있도록 이름을 입력해주세요.' : 
                'Please enter your name so your partner knows who they\'re taking the compatibility test with'
            );
            return;
        }

        // For couple compatibility, we only need one email (the partner's)
        const partnerEmail = feedbackEmails[0]?.trim();
        if (!partnerEmail || !partnerEmail.includes('@')) {
            alert(currentLanguage === 'ko' ? 
                '파트너의 유효한 이메일 주소를 입력해주세요.' : 
                'Please enter your partner\'s valid email address'
            );
            return;
        }

        try {
            setSaving(true);

            if (!user) {
                alert(currentLanguage === 'ko' ? '로그인이 필요합니다.' : 'Authentication required.');
                return;
            }

            console.log('Sending couple compatibility invitation to:', partnerEmail);

            const result = await sendCoupleCompatibilityInvitation(
                user.uid,
                testResultId,
                partnerEmail,
                userName.trim(),
                currentLanguage || 'en',
                user.email || undefined
            );

            console.log('Couple compatibility invitation result:', result);

            if (result.success && result.invitations && result.invitations.length > 0) {
                const invitationLink = result.invitations[0].link;
                
                // Try to show success with the generated link for manual sharing
                const shareMessage = currentLanguage === 'ko' ?
                    `호환성 테스트 링크가 생성되었습니다!\n\n다음 링크를 파트너에게 공유하세요:\n${invitationLink}\n\n링크를 클립보드에 복사하시겠습니까?` :
                    `Compatibility test link generated!\n\nShare this link with your partner:\n${invitationLink}\n\nWould you like to copy the link to clipboard?`;
                    
                const shouldCopy = confirm(shareMessage);
                
                if (shouldCopy) {
                    try {
                        await navigator.clipboard.writeText(invitationLink);
                        alert(currentLanguage === 'ko' ? '링크가 클립보드에 복사되었습니다!' : 'Link copied to clipboard!');
                    } catch (clipboardError) {
                        console.error('Failed to copy to clipboard:', clipboardError);
                        // Fallback: show link in a prompt for manual copying
                        prompt(currentLanguage === 'ko' ? '다음 링크를 복사하세요:' : 'Copy this link:', invitationLink);
                    }
                }
            } else {
                throw new Error('Failed to generate invitation link');
            }

        } catch (error) {
            console.error('Error sending couple compatibility invitation:', error);
            alert(currentLanguage === 'ko' ?
                '초대 전송 중 오류가 발생했습니다. 다시 시도해주세요.' :
                'Error sending invitation. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleSendFeedbackInvitations = async () => {
        console.log('Debug invitation start:', { 
            testResultId, 
            testDefinition: !!testDefinition, 
            userName: userName.trim(),
            feedbackEmails,
            testId,
            currentLanguage: currentLanguage,
            params: params
        });
        
        if (!testResultId) {
            alert(currentLanguage === 'ko' ? '먼저 테스트를 완료해주세요.' : 'Please complete the test first.');
            return;
        }
        
        if (!testDefinition) {
            alert(currentLanguage === 'ko' ? '테스트 정의를 찾을 수 없습니다.' : 'Test definition not found.');
            return;
        }

        const validEmails = feedbackEmails.filter(email => 
            email.trim() && email.includes('@')
        );

        if (!userName.trim()) {
            alert(currentLanguage === 'ko' ? 
                '친구들이 누구에 대한 피드백을 주는지 알 수 있도록 이름을 입력해주세요.' : 
                'Please enter your name so friends know who they\'re giving feedback about'
            );
            return;
        }

        if (validEmails.length === 0) {
            alert(currentLanguage === 'ko' ? 
                '유효한 이메일 주소를 최소 하나 이상 입력해주세요.' : 
                'Please enter at least one valid email address'
            );
            return;
        }

        try {
            setSaving(true);
            
            // First generate invitation links
            if (!user) {
                alert(currentLanguage === 'ko' ? '로그인이 필요합니다.' : 'Authentication required.');
                return;
            }
            
            console.log('About to call sendFeedbackInvitations with language:', currentLanguage);
            console.log('Selected category for feedback:', selectedCategory);
            
            const result = await sendFeedbackInvitations(
                user.uid,
                testId, 
                testResultId, 
                validEmails, 
                userName.trim(), 
                selectedCategory as 'work' | 'friends' | 'family' | 'academic' | 'general',
                currentLanguage || 'en',
                user.email || undefined // Pass user's email for notifications
            );
            
            if (result.success && result.invitations) {
                // Try to send emails automatically using EmailJS
                try {
                    console.log('Starting EmailJS integration...');
                    const emailjs = (await import('@emailjs/browser')).default;
                    
                    // Debug: Check environment variables
                    console.log('EmailJS Config:', {
                        publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY?.substring(0, 10) + '...',
                        serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
                        templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
                    });
                    
                    // Initialize EmailJS with your public key
                    emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY');
                    console.log('EmailJS initialized successfully');
                    
                    // Send emails to all participants
                    const emailPromises = result.invitations.map(async (invitation: any) => {
                        // Debug: Log the email being sent
                        console.log('Sending email to:', invitation.email);
                        
                        const emailParams = {
                            to_email: invitation.email,
                            to_name: invitation.email.split('@')[0],
                            from_name: userName.trim(),
                            invitation_link: invitation.link
                        };
                        
                        // Enhanced EmailJS debug logging
                        console.log('=== EMAILJS DEBUG ===');
                        console.log('EmailJS parameters:', emailParams);
                        console.log('Full invitation link being sent:', invitation.link);
                        console.log('Link length:', invitation.link.length);
                        console.log('Link contains all params?', invitation.link.includes('token=') && invitation.link.includes('name=') && invitation.link.includes('testId=') && invitation.link.includes('testResultId=') && invitation.link.includes('email='));
                        console.log('=== END EMAILJS DEBUG ===');

                        try {
                            const result = await emailjs.send(
                                process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID',
                                process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID',
                                emailParams
                            );
                            console.log('Email sent successfully to:', invitation.email, result);
                            return result;
                        } catch (emailError) {
                            console.error('Failed to send email to:', invitation.email, emailError);
                            throw emailError;
                        }
                    });

                    console.log('Sending all emails...');
                    await Promise.all(emailPromises);
                    console.log('All emails sent successfully!');

                    // Success! Emails were sent
                    alert(currentLanguage === 'ko' ? 
                        `이메일 초대장이 성공적으로 발송되었습니다!\n\n${validEmails.length}개의 이메일이 발송되었습니다. 참가자들이 이메일을 확인하여 피드백을 제공할 수 있습니다.` :
                        `Email invitations sent successfully!\n\n${validEmails.length} emails have been sent. Participants can check their email to provide feedback.`
                    );
                    
                    router.push(`/${currentLanguage}/results`);

                } catch (emailError) {
                    console.error('Email sending failed, falling back to manual sharing:', emailError);
                    
                    // Fallback to manual sharing if email service fails
                    const linksText = result.invitations.map((inv: any) => 
                        `${inv.email}: ${inv.link}`
                    ).join('\n\n');
                    
                    const message = currentLanguage === 'ko' ? 
                        `자동 이메일 발송에 실패했습니다.\n\n다음 링크들을 각 참가자에게 수동으로 공유해주세요:\n\n${linksText}` :
                        `Automatic email sending failed.\n\nPlease manually share these links with your reviewers:\n\n${linksText}`;
                    
                    const confirmed = confirm(`${message}\n\n링크를 클립보드에 복사하시겠습니까? (Would you like to copy the links to clipboard?)`);
                    
                    if (confirmed) {
                        try {
                            await navigator.clipboard.writeText(linksText);
                            alert(currentLanguage === 'ko' ? '링크가 클립보드에 복사되었습니다!' : 'Links copied to clipboard!');
                        } catch (clipboardError) {
                            console.error('Failed to copy to clipboard:', clipboardError);
                            prompt(currentLanguage === 'ko' ? '다음 링크들을 복사하세요:' : 'Copy these links:', linksText);
                        }
                    }
                    
                    router.push(`/${currentLanguage}/results`);
                }
            } else {
                throw new Error('Failed to generate invitation links');
            }
        } catch (error) {
            console.error('Error generating invitations:', error);
            
            // Provide more specific error message
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Detailed error:', errorMessage);
            
            alert(currentLanguage === 'ko' ? 
                `초대장 생성 중 오류가 발생했습니다: ${errorMessage}\n\n다시 시도해주세요.` : 
                `Error generating invitations: ${errorMessage}\n\nPlease try again.`
            );
        } finally {
            setSaving(false);
        }
    };

    // Enhanced authentication check - multiple attempts to catch auth bypass
    useEffect(() => {
        if (isProtectedTest && isClient) {
            console.log('🔐 Enhanced auth check:', { testId, authLoading, hasUser: !!user, isClient });
            
            if (!authLoading && !user) {
                console.log('🚨 REDIRECTING: Protected test without authentication');
                const returnUrl = encodeURIComponent(`/${currentLanguage}/tests/${testId}`);
                router.push(`/${currentLanguage}/auth?returnUrl=${returnUrl}`);
                return;
            }
            
            if (!authLoading) {
                setAuthChecked(true);
            }
        } else if (!isProtectedTest) {
            setAuthChecked(true);
        }
    }, [isProtectedTest, isClient, authLoading, user, router, currentLanguage, testId]);

    // Additional safety check - runs on every render
    useEffect(() => {
        if (isProtectedTest && !authLoading && !user && isClient) {
            console.log('SAFETY REDIRECT: Unauthorized access attempt');
            router.push(`/${currentLanguage}/auth?returnUrl=${encodeURIComponent(`/${currentLanguage}/tests/${testId}`)}`);
        }
    });

    const addEmailField = () => {
        setFeedbackEmails([...feedbackEmails, '']);
    };

    const updateEmail = (index: number, email: string) => {
        const newEmails = [...feedbackEmails];
        newEmails[index] = email;
        setFeedbackEmails(newEmails);
    };

    const removeEmailField = (index: number) => {
        if (feedbackEmails.length > 1) {
            setFeedbackEmails(feedbackEmails.filter((_, i) => i !== index));
        }
    };

    // STRICT AUTHENTICATION CHECK - Block ALL content for protected tests until authenticated
    // This prevents any test content from showing, even briefly
    if (isProtectedTest) {
        // If we're still loading authentication OR user is not authenticated, show loading/redirect
        if (!isClient || authLoading || !user) {
            // If auth is done loading and no user, redirect immediately
            if (!authLoading && !user && isClient) {
                const returnUrl = encodeURIComponent(`/${currentLanguage}/tests/${testId}`);
                router.push(`/${currentLanguage}/auth?returnUrl=${returnUrl}`);
            }
            
            return (
                <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
                        <p className="mt-4 text-lg text-white">
                            {!authLoading && !user ? 
                                (currentLanguage === 'ko' ? '로그인 페이지로 이동 중...' : 'Redirecting to login...') :
                                (currentLanguage === 'ko' ? '인증 확인 중...' : 'Checking authentication...')
                            }
                        </p>
                    </div>
                </div>
            );
        }
    }
    
    // Show normal loading for non-protected tests or when loading test definition
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
                    <p className="mt-4 text-lg text-white">
                        {currentLanguage === 'ko' ? 
                            '테스트 로딩 중...' :
                         currentLanguage === 'ja' ? 
                            'テスト読み込み中...' :
                         currentLanguage === 'zh' ? 
                            '正在加载测试...' :
                            'Loading test...'
                        }
                    </p>
                </div>
            </div>
        );
    }

    // Authentication is now handled above for all protected tests

    // Show category selection for feedback-360 test
    if (showCategorySelection && testId === 'feedback-360') {
        // Debug translation loading
        console.log('=== CATEGORY TRANSLATION DEBUG ===');
        console.log('Current language:', currentLanguage);
        console.log('Translation test - work:', t('tests.feedback360.categories.work'));
        console.log('Translation test - friends:', t('tests.feedback360.categories.friends'));
        console.log('=== END TRANSLATION DEBUG ===');
        
        // Check if Korean language
        const isKorean = currentLanguage === 'ko';
        
        const categories = [
            { 
                key: 'work', 
                label: isKorean ? '직장 동료' : 'Work Colleagues'
            },
            { 
                key: 'friends', 
                label: isKorean ? '친구' : 'Friends'
            },
            { 
                key: 'family', 
                label: isKorean ? '가족' : 'Family'
            },
            { 
                key: 'academic', 
                label: isKorean ? '학업 파트너' : 'Academic Partners'
            },
            { 
                key: 'general', 
                label: isKorean ? '일반적 관계' : 'General Relationships'
            }
        ];

        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/95 backdrop-blur-sm border border-white/30 rounded-lg shadow-lg p-8">
                    {/* User Greeting Section */}
                    {user && (
                        <div className="mb-6 text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="text-green-600 text-sm font-medium mb-1">
                                {currentLanguage === 'ko' ? '로그인됨' : 'Logged in as'}
                            </div>
                            <div className="text-gray-800 font-semibold">
                                {user.displayName || user.email || 'User'}
                            </div>
                            <div className="text-green-600 text-xs mt-1">
                                ✓ {currentLanguage === 'ko' ? '인증 완료' : 'Authenticated'}
                            </div>
                        </div>
                    )}
                    
                    <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">
                        {t('tests.feedback360.title')}
                    </h1>
                    <p className="text-gray-600 mb-6 text-center">
                        {currentLanguage === 'ko' ? 
                            '먼저 피드백을 받을 관계 카테고리를 선택해주세요:' :
                            'First, please select a relationship category for feedback:'
                        }
                    </p>
                    <div className="space-y-3">
                        {categories.map((category) => (
                            <button
                                key={category.key}
                                onClick={() => {
                                    setSelectedCategory(category.key);
                                    setShowCategorySelection(false);
                                }}
                                className="w-full p-4 text-left bg-gray-50 hover:bg-indigo-50 border border-gray-200 rounded-lg transition-all duration-200 hover:border-indigo-300"
                            >
                                <div className="font-medium text-gray-800">{category.label}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!testDefinition) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600 flex items-center justify-center">
                <div className="text-center p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold mb-4 text-white">
                        {currentLanguage === 'ko' ? 
                            '테스트를 찾을 수 없습니다' :
                         currentLanguage === 'ja' ? 
                            'テストが見つかりません' :
                         currentLanguage === 'zh' ? 
                            '未找到测试' :
                            'Test Not Found'
                        }
                    </h1>
                    <button
                        onClick={() => router.push(`/${currentLanguage}/tests`)}
                        className="p-4 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition-all"
                    >
                        {currentLanguage === 'ko' ? 
                            '테스트로 돌아가기' :
                         currentLanguage === 'ja' ? 
                            'テストに戻る' :
                         currentLanguage === 'zh' ? 
                            '回到测试' :
                            'Back to Tests'
                        }
                    </button>
                </div>
            </div>
        );
    }

    // FORCE name input for 360-degree test - DEBUG VERSION
    if (testId === 'feedback-360' && !userName) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600 flex items-center justify-center p-8">
                <div className="w-full max-w-2xl p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg shadow-lg text-center">
                    {/* User Greeting Section */}
                    {user && (
                        <div className="mb-6 p-4 bg-white/10 border border-white/30 rounded-lg backdrop-blur-sm">
                            <div className="text-green-300 text-sm font-medium mb-1">
                                {currentLanguage === 'ko' ? '안녕하세요!' : 'Hello!'}
                            </div>
                            <div className="text-white font-semibold text-lg">
                                {user.displayName || user.email || 'User'}
                            </div>
                            <div className="text-green-300 text-xs mt-1">
                                ✓ {currentLanguage === 'ko' ? '로그인 완료' : 'Successfully logged in'}
                            </div>
                        </div>
                    )}
                    
                    <h1 className="text-3xl font-bold mb-4 text-white">
                        🌟 {t('ui.feedback360Title') || '360° Feedback Assessment'}
                    </h1>
                    <p className="text-lg text-white/90 mb-6">
                        {t('ui.feedback360Description') || 'This assessment helps you understand how others see you. Friends, family, and colleagues will answer questions about you personally.'}
                    </p>
                    
                    <div className="mb-6">
                        <label className="block text-lg font-medium mb-3 text-white">
                            {t('ui.enterYourName') || 'What should we call you?'}
                        </label>
                        
                        {/* Cultural examples */}
                        <div className="mb-4 p-3 bg-white/10 rounded-lg text-sm text-white/70">
                            <p className="font-medium mb-2">
                                {t('ui.examples') || 'Examples:'}
                            </p>
                            <div className="text-xs">
                                {currentLanguage === 'ko' ? (
                                    <div>• 성: 김, 이름: 철수</div>
                                ) : currentLanguage === 'ja' ? (
                                    <div>• 姓: 田中, 名: 太郎</div>
                                ) : currentLanguage === 'zh' ? (
                                    <div>• 姓: 王, 名: 小明</div>
                                ) : (
                                    <div>• First: Sarah, Last: Johnson</div>
                                )}
                            </div>
                        </div>

                        {/* Name Input Fields */}
                        <div className="space-y-3 mb-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-white/80">
                                        {t('ui.lastNameKo') || 'Last Name'}
                                    </label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder={
                                            currentLanguage === 'ko' ? '김' :
                                            currentLanguage === 'ja' ? '田中' :
                                            currentLanguage === 'zh' ? '王' :
                                            'Johnson'
                                        }
                                        className="w-full p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-white/80">
                                        {t('ui.firstNameKo') || 'First Name'}
                                    </label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder={
                                            currentLanguage === 'ko' ? '철수' :
                                            currentLanguage === 'ja' ? '太郎' :
                                            currentLanguage === 'zh' ? '小明' :
                                            'Sarah'
                                        }
                                        className="w-full p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-sm text-white/60 mt-2">
                            {currentLanguage === 'ko' 
                                ? `질문 예시: "${getFormattedNameFromParts(lastName, firstName) || '김철수님'}은(는) 사람들의 마음을 사로잡는 것을 잘하나요?"`
                                : `Question example: "Is ${getFormattedNameFromParts(lastName, firstName) || 'your name'} good at captivating people?"`
                            }
                        </p>
                    </div>
                    
                    <button
                        onClick={() => {
                            if (lastName.trim() || firstName.trim()) {
                                setUserName(getFormattedNameFromParts(lastName, firstName));
                                setShowNameInput(false);
                            } else {
                                alert(currentLanguage === 'ko' ? '이름을 입력해 주세요' : 
                                     currentLanguage === 'ja' ? '名前を入力してください' : 
                                     'Please enter your name to continue');
                            }
                        }}
                        disabled={!lastName.trim() && !firstName.trim()}
                        className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('ui.startAssessment') || 'Start Assessment ✨'}
                    </button>
                    
                    <div className="mt-6">
                        <button
                            onClick={() => router.push(`/${currentLanguage}/tests`)}
                            className="text-white/60 hover:text-white/80 text-sm underline"
                        >
                            {t('ui.backToTests') || 'Back to Tests'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show resume prompt if saved progress exists
    if (showResumePrompt && hasInProgressTest) {
        const savedProgress = loadTestProgress();
        const progressPercentage = savedProgress ? Math.round((Object.keys(savedProgress.answers).length / (savedProgress.totalQuestions || 1)) * 100) : 0;
        
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600 flex items-center justify-center p-8">
                <div className="w-full max-w-2xl p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg shadow-lg text-center">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold mb-4 text-white">
                            🔄 {t('ui.resumeTestTitle') || 'Resume Your Test?'}
                        </h1>
                        <p className="text-lg text-white/90 mb-2">
                            {t('ui.testInProgress') || 'You have a test in progress for'} <strong>{t(testDefinition.title_key) || testDefinition.title_key}</strong>
                        </p>
                        <p className="text-white/80 mb-6">
                            {t('ui.completedQuestions') || 'You\'ve completed'} {Object.keys(savedProgress?.answers || {}).length} {t('ui.outOf') || 'out of'} {testDefinition.questions.length} {t('ui.questions') || 'questions'}
                        </p>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-white/20 rounded-full h-4 mb-6">
                            <div
                                className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                        
                        <p className="text-sm text-white/70 mb-8">
                            {savedProgress?.timestamp && 
                                `${t('ui.lastUpdated') || 'Last updated:'} ${new Date(savedProgress.timestamp).toLocaleString()}`
                            }
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={resumeFromProgress}
                            className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 text-lg"
                        >
                            🚀 {t('ui.resumeTest') || 'Resume Test'} ({progressPercentage}{t('ui.percentComplete') || '% complete'})
                        </button>
                        
                        <button
                            onClick={startFreshTest}
                            className="px-8 py-4 bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-lg hover:bg-white/30 transition-all duration-300"
                        >
                            🔄 {t('ui.startFresh') || 'Start Fresh'}
                        </button>
                    </div>
                    
                    <div className="mt-6">
                        <button
                            onClick={() => router.push(`/${currentLanguage}/tests`)}
                            className="text-white/60 hover:text-white/80 text-sm underline"
                        >
                            {t('ui.backToTests') || 'Back to Tests'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (testCompleted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600 flex items-center justify-center p-8">
                <div className="text-center w-full max-w-2xl p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg shadow-lg">
                    <h1 className="text-4xl font-bold mb-4 text-white" data-translate="test.completed_title">
                        {isInvitationAccess && partnerName ? 
                            `💕 Thanks for taking ${partnerName}'s compatibility test!` :
                            (t('test.completed_title') || 'Test Completed!')
                        }
                    </h1>
                    
                    {/* Special message for invitation access */}
                    {isInvitationAccess && partnerName && (
                        <div className="mb-6 p-4 bg-pink-500/30 border border-pink-400/50 rounded-lg">
                            <p className="text-white text-lg">
                                {currentLanguage === 'ko' ? 
                                    `${partnerName}님과의 커플 호환성 결과를 이메일로 받아보실 수 있습니다!` :
                                    `You and ${partnerName} will both receive the compatibility results via email!`
                                }
                            </p>
                        </div>
                    )}
                    
                    {/* Show Results Immediately */}
                    {completedTestResult && (
                        <div className="mb-8 p-6 bg-white/30 backdrop-blur-sm border border-white/40 rounded-lg">
                            <h2 className="text-2xl font-bold mb-4 text-white" data-translate="results.personalityType">
                                {t('results.personalityType') || 'Your Personality Type'}
                            </h2>
                            {completedTestResult.type && (
                                <div className="text-3xl font-bold text-yellow-300 mb-4">
                                    {testId === 'couple-compatibility' 
                                        ? (t(`couple.personalityTypes.${completedTestResult.type}`) || completedTestResult.type)
                                        : (t(completedTestResult.type) || completedTestResult.type)}
                                </div>
                            )}
                            
                            {completedTestResult.scores && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
                                    {Object.entries(completedTestResult.scores).map(([dimension, percentage]) => (
                                        <div key={dimension} className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-semibold text-lg text-gray-900 dark:text-white">
                                                    {t(`results.dimensions.${dimension}`) || dimension}
                                                </div>
                                                <div className="text-xl font-bold text-yellow-300">{String(percentage)}%</div>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="w-full bg-white/10 rounded-full h-3 mb-2">
                                                <div 
                                                    className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-200 h-3 rounded-full transition-all duration-1000 ease-out"
                                                    style={{ 
                                                        width: `${Math.min(Number(percentage) || 0, 100)}%`,
                                                        animation: 'progressFill 1.5s ease-out'
                                                    }}
                                                ></div>
                                            </div>
                                            {/* Visual Indicator */}
                                            <div className="text-sm text-gray-800 dark:text-white/90 font-medium">
                                                {Number(percentage) >= 75 ? `🔥 ${t('results.indicators.strongPreference') || 'Strong preference'}` : 
                                                 Number(percentage) >= 60 ? `✨ ${t('results.indicators.clearTendency') || 'Clear tendency'}` : 
                                                 Number(percentage) >= 40 ? `⚖️ ${t('results.indicators.moderateLean') || 'Moderate lean'}` : 
                                                 `🤔 ${t('results.indicators.balanced') || 'Balanced'}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Detailed Insights */}
                    {completedTestResult && completedTestResult.traits && (
                            <div className="mb-8 p-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg">
                                <h3 className="text-xl font-bold mb-4 text-white" data-translate="results.keyTraits">
                                    ✨ {t('results.keyTraits') || 'Your Key Traits'}
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {completedTestResult.traits.map((trait: string, index: number) => (
                                        <span key={index} className="px-4 py-2 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-full text-sm font-medium">
                                            {testId === 'couple-compatibility' 
                                                ? (t(`couple.traits.${trait}`) || trait)
                                                : (t(trait) || trait)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {completedTestResult && completedTestResult.strengths && (
                            <div className="mb-8 p-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg">
                                <h3 className="text-xl font-bold mb-4 text-white" data-translate="results.strengths">
                                    💪 {t('results.strengths') || 'Your Strengths'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {completedTestResult.strengths.map((strength: string, index: number) => (
                                        <div key={index} className="flex items-center text-white/90">
                                            <span className="text-green-400 mr-2">✓</span>
                                            {t('results.strengthPrefix') || 'Strong in'} {t(`results.dimensions.${strength}`) || strength}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {completedTestResult && completedTestResult.recommendations && (
                            <div className="mb-8 p-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg">
                                <h3 className="text-xl font-bold mb-4 text-white" data-translate="results.growthOpportunities">
                                    🎯 {t('results.growthOpportunities') || 'Growth Opportunities'}
                                </h3>
                                <div className="space-y-3">
                                    {completedTestResult.recommendations.map((rec: string, index: number) => (
                                        <div key={index} className="flex items-start text-white/90">
                                            <span className="text-blue-400 mr-2 mt-1">💡</span>
                                            <span>{t('results.developmentPrefix') || 'Focus on developing'} {t(`results.dimensions.${rec}`) || rec}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Personality Description */}
                        {completedTestResult && completedTestResult.description_key && (
                            <div className="mb-8 p-6 bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-sm border border-white/30 rounded-lg">
                                <h3 className="text-xl font-bold mb-4 text-white" data-translate="results.aboutType">
                                    🧠 {t('results.aboutType') || 'About Your Type'}
                                </h3>
                                <p className="text-white/90 text-lg leading-relaxed">
                                    {t(completedTestResult.description_key) || completedTestResult.description_key}
                                </p>
                            </div>
                        )}

                    {/* Optional Email Signup */}
                    <EmailSignup 
                        testType={testId} 
                        personalityType={completedTestResult?.type}
                    />

                    {testDefinition.requiresFeedback && (
                        <div className="mb-8 p-6 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg">
                            {testId === 'couple-compatibility' ? (
                                <>
                                    <h2 className="text-xl font-bold mb-4 text-white">
                                        💕 {t('test.invite_partner_title') || 'Invite Your Partner'}
                                    </h2>
                                    <p className="text-sm mb-4 text-white/80">
                                        {t('test.invite_partner_description') || 'Send an invitation to your partner to complete their part of the compatibility test. You\'ll both receive the results once they finish.'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-xl font-bold mb-4 text-white" data-translate="test.invite_feedback_title">
                                        {t('test.invite_feedback_title') || 'Invite Others for Feedback'}
                                    </h2>
                                    <p className="text-sm mb-4 text-white/80" data-translate="test.invite_feedback_description">
                                        {t('test.invite_feedback_description') || 'Get a complete picture by inviting friends and colleagues to provide feedback about you.'}
                                    </p>
                                </>
                            )}
                            
                            {/* Name Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-white">
                                    {testId === 'couple-compatibility' 
                                        ? (t('test.your_name_for_partner') || 'Your name (so your partner knows who invited them)')
                                        : (t('feedbackInvite.nameQuestion') || 'What name should your friends use when giving feedback?')
                                    }
                                </label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="Enter your first name (e.g., Sarah, Mike)"
                                    className="w-full p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                                <p className="text-xs text-white/60 mt-1">
                                    {userName ? 
                                        `${t('feedbackInvite.exampleText') || 'Questions will be like:'} "${userName.endsWith('님') ? userName.slice(0, -1) : userName}${t('feedbackInvite.exampleQuestion') || t('feedbackInvite.exampleQuestionFallback') || ' good at getting people excited about stuff they want to do?'}"` :
                                        `${t('feedbackInvite.exampleText') || 'Questions will be like:'} "[${t('ui.yourName') || 'your name'}]${t('feedbackInvite.exampleQuestion') || t('feedbackInvite.exampleQuestionFallback') || ' good at getting people excited about stuff they want to do?'}"`
                                    }
                                </p>
                            </div>
                            
                            {testId === 'couple-compatibility' ? (
                                // Single email input for partner
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2 text-white">
                                            {t('test.partner_email') || 'Your Partner\'s Email Address'}
                                        </label>
                                        <input
                                            type="email"
                                            value={feedbackEmails[0] || ''}
                                            onChange={(e) => updateEmail(0, e.target.value)}
                                            placeholder={t('test.partner_email_placeholder') || 'Enter your partner\'s email address'}
                                            className="w-full p-3 bg-white/10 border border-white/30 rounded text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
                                        />
                                    </div>
                                    <div className="flex justify-center mb-4">
                                        <button
                                            onClick={handleSendCoupleCompatibilityInvitation}
                                            disabled={saving}
                                            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-red-600 disabled:opacity-50 transition-all duration-300"
                                        >
                                            {saving ? (t('test.sending_invitation') || 'Sending Invitation...') : (t('test.send_partner_invitation') || '💕 Send Partner Invitation')}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                // Multiple email inputs for feedback
                                <>
                                    <div className="space-y-3 mb-4">
                                        {feedbackEmails.map((email, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => updateEmail(index, e.target.value)}
                                                    placeholder={t('feedbackInvite.emailPlaceholder') || 'Enter email address'}
                                                    className="flex-1 p-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
                                                />
                                                {feedbackEmails.length > 1 && (
                                                    <button
                                                        onClick={() => removeEmailField(index)}
                                                        className="p-2 text-red-500 hover:text-red-700"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="flex gap-2 justify-center mb-4">
                                        <button
                                            onClick={addEmailField}
                                            className="px-4 py-2 text-sm bg-white/20 text-white rounded hover:bg-white/30 backdrop-blur-sm border border-white/30 transition-all duration-300"
                                        >
                                            {t('feedbackInvite.addAnother') || 'Add Another Email'}
                                        </button>
                                        <button
                                            onClick={handleSendFeedbackInvitations}
                                            disabled={saving}
                                            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 backdrop-blur-sm border border-white/20 transition-all duration-300"
                                        >
                                            {saving ? (t('feedbackInvite.sending') || 'Sending...') : (t('feedbackInvite.sendInvitations') || 'Send Invitations')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="flex justify-center mt-8">
                        <button
                            onClick={() => router.push(`/${currentLanguage}/tests`)}
                            className="p-4 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-all text-xl"
                            data-translate="test.take_another"
                        >
                            {t('test.take_another') || 'Take Another Test'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (saving) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
                    <p className="mt-4 text-lg text-white">Saving your results...</p>
                </div>
            </div>
        );
    }

    const currentQuestion = testDefinition.questions[currentQuestionIndex];
    
    // For 360-degree test, get the translated text and personalize with user's name
    const getDisplayedQuestionText = () => {
        if (testId === 'feedback-360' && userName) {
            // Get the translation first, then replace [NAME]
            let translatedText = t(currentQuestion.text_key);
            
            // If translation not found, use the text_key as fallback
            if (!translatedText || translatedText === currentQuestion.text_key) {
                translatedText = currentQuestion.text_key;
            }
            
            console.log('Debug translation:', {
                key: currentQuestion.text_key,
                translatedText,
                currentLanguage,
                userName
            });
            
            return translatedText.replace(/\[NAME\]/g, userName);
        }
        // For other tests, use normal translation
        return t(currentQuestion.text_key) || currentQuestion.text_key;
    };
        
    // Debug: log the name formatting
    console.log('Debug name info:', { 
        currentLanguage, 
        userName, 
        testId,
        originalName: nameInputValue,
        formattedName: userName 
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600 flex items-center justify-center p-8">
            <div className="w-full max-w-3xl">
                <div className="mb-8 text-center">
                    {/* Special header for invitation access */}
                    {isInvitationAccess && partnerName && (
                        <div className="mb-6 p-4 bg-pink-500/30 border border-pink-400/50 rounded-lg">
                            <h1 className="text-2xl font-bold text-white mb-2">
                                💕 {currentLanguage === 'ko' ? 
                                    `${partnerName}님이 초대했습니다!` :
                                    `${partnerName} invited you!`
                                }
                            </h1>
                            <p className="text-white/90">
                                {currentLanguage === 'ko' ? 
                                    '두 분의 커플 호환성을 테스트해보세요!' :
                                    'Take this couple compatibility test together!'
                                }
                            </p>
                        </div>
                    )}
                    
                    <h1 className="text-3xl font-bold mb-4 text-white" data-translate={testDefinition.title_key}>
                        {t(testDefinition.title_key) || testDefinition.title_key}
                    </h1>
                    <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-3 mb-2">
                        <div
                            className="bg-gradient-to-r from-yellow-300 to-orange-400 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${((currentQuestionIndex + 1) / testDefinition.questions.length) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-white/80 text-sm">
                        Question {currentQuestionIndex + 1} of {testDefinition.questions.length}
                    </p>
                </div>

                <div className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg shadow-lg">
                    <h2 className="mb-6 text-xl font-semibold tracking-tight text-white">
                        {getDisplayedQuestionText()}
                    </h2>

                    {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                        <div className="flex flex-col gap-3">
                            {currentQuestion.options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleAnswer(option.value)}
                                    className="w-full p-4 text-left bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 transition-all duration-300 transform hover:scale-105 text-white"
                                    data-translate={option.text_key}
                                >
                                    {t(option.text_key) || option.text_key}
                                </button>
                            ))}
                        </div>
                    )}

                    {currentQuestion.type === 'scale' && currentQuestion.scale && (
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm text-white/80">
                                <span data-translate={currentQuestion.scale.minLabel_key}>
                                    {t(currentQuestion.scale.minLabel_key) || currentQuestion.scale.minLabel_key}
                                </span>
                                <span data-translate={currentQuestion.scale.maxLabel_key}>
                                    {t(currentQuestion.scale.maxLabel_key) || currentQuestion.scale.maxLabel_key}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2">
                                {Array.from({ length: currentQuestion.scale.max - currentQuestion.scale.min + 1 }, (_, i) => {
                                    const value = currentQuestion.scale!.min + i;
                                    return (
                                        <button
                                            key={value}
                                            onClick={() => handleAnswer(value)}
                                            className="flex-1 py-3 text-center bg-white/20 backdrop-blur-sm border border-white/30 rounded hover:bg-white/30 hover:scale-105 transition-all duration-300 text-white font-semibold"
                                        >
                                            {value}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* Test Controls */}
                    <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex gap-3">
                            {/* Previous Button */}
                            {currentQuestionIndex > 0 && (
                                <button
                                    onClick={() => {
                                        const prevIndex = currentQuestionIndex - 1;
                                        setCurrentQuestionIndex(prevIndex);
                                        saveTestProgress(prevIndex, answers);
                                    }}
                                    className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-lg hover:bg-white/20 transition-all duration-300"
                                >
                                    ← {t('ui.previous') || 'Previous'}
                                </button>
                            )}
                            
                            {/* Pause & Save Progress Button */}
                            <button
                                onClick={() => {
                                    saveTestProgress(currentQuestionIndex, answers);
                                    router.push(`/${currentLanguage}/tests`);
                                }}
                                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
                            >
                                💾 {t('ui.saveExit') || 'Save & Exit'}
                            </button>
                        </div>
                        
                        <div className="text-white/70 text-sm text-center">
                            <p className="mb-1">{t('ui.progressSaved') || 'Progress automatically saved'}</p>
                            <div className="flex items-center gap-2 justify-center">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>{t('ui.answersSaved') || 'Your answers are being saved'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}