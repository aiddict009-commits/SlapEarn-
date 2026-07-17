import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, Clock, Award, ChevronRight, ArrowLeft, Check, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/sound';
import { Survey, Transaction } from '../types';

interface SurveysProps {
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
}

const MOCK_SURVEYS: Survey[] = [
  {
    id: 'survey-1',
    title: 'Streaming & Entertainment Habits',
    category: 'Media & Entertainment',
    reward: 250,
    duration: '2 mins',
    sponsor: 'Netflix Research Group',
    completed: false,
    questions: [
      {
        id: 's1-q1',
        text: 'How many hours per week do you spend watching streaming services (Netflix, YouTube, Prime)?',
        options: ['Less than 2 hours', '2 - 5 hours', '5 - 10 hours', 'More than 10 hours']
      },
      {
        id: 's1-q2',
        text: 'What is your primary device used for viewing entertainment content?',
        options: ['Smart TV', 'Laptop / PC', 'Smartphone', 'Tablet / iPad']
      },
      {
        id: 's1-q3',
        text: 'Which of the following services are you currently subscribed to? (Select primary)',
        options: ['Netflix', 'Disney+ / Hulu', 'Amazon Prime Video', 'YouTube Premium / None']
      }
    ]
  },
  {
    id: 'survey-2',
    title: 'Gaming Preferences & Setup',
    category: 'Gaming & Tech',
    reward: 350,
    duration: '3 mins',
    sponsor: 'Razer Consumer Labs',
    completed: false,
    questions: [
      {
        id: 's2-q1',
        text: 'Which gaming platform is your primary gaming device?',
        options: ['PC / Steam', 'PlayStation or Xbox', 'Nintendo Switch', 'Mobile Phone']
      },
      {
        id: 's2-q2',
        text: 'On average, how much do you spend monthly on in-game items or microtransactions?',
        options: ['$0 (Free to Play)', '$1 - $10', '$10 - $30', 'More than $30']
      },
      {
        id: 's2-q3',
        text: 'How likely are you to purchase gaming accessories (headphones, mice) in the next 6 months?',
        options: ['Very Unlikely', 'Somewhat Unlikely', 'Somewhat Likely', 'Very Likely']
      }
    ]
  },
  {
    id: 'survey-3',
    title: 'Fast Food & Delivery Apps',
    category: 'Consumer & Food',
    reward: 200,
    duration: '1.5 mins',
    sponsor: 'UberEats Analytics',
    completed: false,
    questions: [
      {
        id: 's3-q1',
        text: 'How frequently do you order delivery via food apps like UberEats or DoorDash?',
        options: ['Rarely / Never', '1 - 2 times per month', 'Once a week', 'Multiple times per week']
      },
      {
        id: 's3-q2',
        text: 'Which brand do you usually lean towards when buying fast food?',
        options: ['Burgers (McDonalds/BK)', 'Pizza (Dominoes/PH)', 'Chicken (KFC/Popeyes)', 'Healthy / Salads']
      },
      {
        id: 's3-q3',
        text: 'What is the most important factor when choosing a food delivery app?',
        options: ['Delivery Fee / Discounts', 'Delivery Speed', 'Restaurant Selection', 'App Interface Ease']
      }
    ]
  }
];

export default function Surveys({ updateCoinsAndXp, addNotification }: SurveysProps) {
  const [surveys, setSurveys] = useState<Survey[]>(() => {
    const cached = localStorage.getItem('slapearn_surveys');
    return cached ? JSON.parse(cached) : MOCK_SURVEYS;
  });

  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});
  const [surveyCompleteStage, setSurveyCompleteStage] = useState<boolean>(false);

  // Cache survey statuses
  const saveSurveysToLocalStorage = (updated: Survey[]) => {
    localStorage.setItem('slapearn_surveys', JSON.stringify(updated));
    setSurveys(updated);
  };

  const handleStartSurvey = (survey: Survey) => {
    if (survey.completed) {
      sound.playError();
      return;
    }
    setActiveSurvey(survey);
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setSurveyAnswers({});
    setSurveyCompleteStage(false);
  };

  const handleNextQuestion = () => {
    if (!selectedAnswer || !activeSurvey) return;

    const currentQuestion = activeSurvey.questions[currentQuestionIdx];
    const updatedAnswers = { ...surveyAnswers, [currentQuestion.id]: selectedAnswer };
    setSurveyAnswers(updatedAnswers);

    if (currentQuestionIdx < activeSurvey.questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setSelectedAnswer(null);
    } else {
      // Completed all questions
      setSurveyCompleteStage(true);
    }
  };

  const handleFinishSurvey = () => {
    if (!activeSurvey) return;

    // Award rewards
    updateCoinsAndXp(activeSurvey.reward, 100, 'Survey', `Completed survey: ${activeSurvey.title}`);
    sound.playSuccess();
    addNotification('Survey Finished!', `Earned +${activeSurvey.reward} Coins & +100 XP from ${activeSurvey.sponsor}!`, 'success');

    // Mark completed
    const updatedSurveys = surveys.map((s) =>
      s.id === activeSurvey.id ? { ...s, completed: true } : s
    );
    saveSurveysToLocalStorage(updatedSurveys);

    // Reset state
    setActiveSurvey(null);
    setSurveyCompleteStage(false);
  };

  const handleResetSurveys = () => {
    saveSurveysToLocalStorage(MOCK_SURVEYS);
    sound.playSuccess();
    addNotification('Surveys Refreshed!', 'All consumer research surveys are ready to complete again!', 'info');
  };

  const allCompleted = surveys.every((s) => s.completed);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl" id="surveys-tab">
      <AnimatePresence mode="wait">
        {!activeSurvey ? (
          /* Survey Dashboard list view */
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 font-display font-semibold tracking-wide text-sm uppercase">
                  <ClipboardCheck className="w-5 h-5 text-indigo-400" />
                  <span>Interactive Micro-Surveys</span>
                </div>
                <h2 className="text-2xl font-bold font-display text-white mt-1">Consumer Feedback Panel</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Share your honest opinions with top-tier brands to earn heavy coin rewards instantly.
                </p>
              </div>

              {allCompleted && (
                <button
                  onClick={handleResetSurveys}
                  id="reset-surveys-btn"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-xl font-display font-bold transition-all flex items-center gap-2"
                >
                  Refresh Surveys
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {surveys.map((survey) => (
                <div
                  key={survey.id}
                  id={`survey-card-${survey.id}`}
                  className={`flex flex-col justify-between p-5 rounded-2xl border transition-all h-60 ${
                    survey.completed
                      ? 'bg-slate-950 border-emerald-500/20 text-slate-500'
                      : 'bg-slate-950/40 hover:bg-slate-950 border-slate-850 hover:border-slate-700 text-white'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        survey.completed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        {survey.category}
                      </span>
                      {survey.completed && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          Completed
                        </div>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-base leading-snug line-clamp-2">
                      {survey.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Sponsored by: {survey.sponsor}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{survey.duration}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Award className="w-3.5 h-3.5" />
                        <span>+{survey.reward} Coins</span>
                      </div>
                    </div>

                    {!survey.completed && (
                      <button
                        onClick={() => handleStartSurvey(survey)}
                        id={`start-survey-${survey.id}`}
                        className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-md"
                      >
                        <ChevronRight className="w-4 h-4 stroke-[3px]" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Live survey question modal flow */
          <motion.div
            key="live-survey"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-2xl mx-auto py-4"
          >
            {!surveyCompleteStage ? (
              /* Question screens */
              <div id="survey-question-panel">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <button
                    onClick={() => setActiveSurvey(null)}
                    id="exit-survey-btn"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-display font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Cancel Survey</span>
                  </button>

                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase font-mono">
                      Step {currentQuestionIdx + 1} of {activeSurvey.questions.length}
                    </div>
                    {/* Tiny visual progress bar */}
                    <div className="w-24 bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIdx + 1) / activeSurvey.questions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850">
                  <span className="text-[10px] font-mono font-black text-indigo-400 tracking-wider uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Question {currentQuestionIdx + 1}
                  </span>
                  
                  <h3 className="text-lg font-bold font-display text-white mt-3 leading-snug">
                    {activeSurvey.questions[currentQuestionIdx].text}
                  </h3>

                  <div className="space-y-2.5 mt-6">
                    {activeSurvey.questions[currentQuestionIdx].options.map((option) => {
                      const isSelected = selectedAnswer === option;
                      return (
                        <button
                          key={option}
                          onClick={() => setSelectedAnswer(option)}
                          id={`survey-option-${option.replace(/\s+/g, '-')}`}
                          className={`w-full p-4 rounded-xl border text-left transition-all text-sm font-display flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-lg'
                              : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-850 hover:border-slate-700'
                          }`}
                        >
                          <span>{option}</span>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500 text-slate-950'
                              : 'border-slate-700 bg-slate-950'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={handleNextQuestion}
                    disabled={!selectedAnswer}
                    id="survey-next-btn"
                    className={`px-6 py-3 rounded-xl font-display font-semibold transition-all ${
                      selectedAnswer
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {currentQuestionIdx < activeSurvey.questions.length - 1 ? 'Next Question' : 'Submit Survey'}
                  </button>
                </div>
              </div>
            ) : (
              /* Success completion screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
                id="survey-complete-panel"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 stroke-[1.5px]" />
                </div>

                <span className="text-[11px] font-mono font-bold tracking-wider text-slate-500 uppercase bg-slate-950 px-3 py-1 rounded-full border border-slate-850">
                  Opinions Submitted Successfully
                </span>

                <h3 className="text-2xl font-black font-display text-white mt-4">
                  Surveys Complete!
                </h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2">
                  Thank you for participating! {activeSurvey.sponsor} has approved your responses. Your reward has been credited.
                </p>

                <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4 max-w-xs mx-auto my-6 flex justify-around text-center">
                  <div>
                    <div className="text-2xl font-black font-display text-amber-500">+{activeSurvey.reward}</div>
                    <div className="text-xs text-slate-500">Coins Received</div>
                  </div>
                  <div className="w-px bg-slate-800" />
                  <div>
                    <div className="text-2xl font-black font-display text-emerald-400">+100</div>
                    <div className="text-xs text-slate-500">XP Received</div>
                  </div>
                </div>

                <button
                  onClick={handleFinishSurvey}
                  id="survey-claim-btn"
                  className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl tracking-wide uppercase text-xs"
                >
                  Collect Loot & Exit
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
