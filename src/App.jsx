import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Lightbulb, FolderKanban, PlusCircle,
  CheckCircle2, Clock, AlertCircle, Megaphone, Calendar, MapPin,
  MessageSquare, ExternalLink, BookOpen, FolderOpen, PlaySquare,
  BarChart2, Activity, TrendingUp, TestTube, Star, Home, Layers, Shield,
  ThumbsUp, X
} from 'lucide-react';

const parseCSV = (csvText) => {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else if (char !== '\r') {
      currentCell += char;
    }
  }
  if (currentRow.length > 0 || currentCell !== '') {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
};

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [activeSubTab, setActiveSubTab] = useState('tasks');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedProposalForVote, setSelectedProposalForVote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [minutes, setMinutes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const SHEET_ID = '1TC-s5WN4qEvL9AFy_rMauZXJ2mbWUlay9inGUYeu7s8';
  const VOTE_FORM_URL = "https://docs.google.com/forms/d/1FbhwPOdz8CPEWV4kKKDg7BT58ZuC8-3gYsSxfvq5yek/viewform?embedded=true";

  useEffect(() => {
    const fetchDatabase = async () => {
      setIsLoading(true);
      setLoadError(false);
      try {
        const fetchTab = async (tabName) => {
          const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Fetch failed');
          const text = await res.text();
          return parseCSV(text);
        };

        const [tasksData, proposalsData, eqData, minutesData, dashboardData, announcementData] = await Promise.all([
          fetchTab('智庫任務列管'),
          fetchTab('同仁實務提案'),
          fetchTab('裝備實測回饋'),
          fetchTab('近期會議紀錄'),
          fetchTab('首頁儀表板數據'),
          fetchTab('最新公告')
        ]);

        if (tasksData.length > 0 && tasksData[0] && tasksData[0]['<!DOCTYPE html>'] !== undefined) {
          throw new Error('Permission Denied');
        }

        setTasks(tasksData.filter(d => d.id).map(d => ({
          id: d.id, title: d['任務名稱'], assignee: d['專案負責'], deadline: d['追蹤期限'], status: d['狀態'], priority: d['優先級']
        })));

        setProposals(proposalsData.filter(d => d.id).map(d => ({
          id: d.id, title: d['提案名稱'], author: d['提案人'], date: d['提案日期'], status: d['狀態'], likes: d['支持數']
        })));

        setEquipments(eqData.filter(d => d.id).map(d => ({
          id: d.id, name: d['測試裝備名稱'], stage: d['測試階段'], testers: d['測試單位'], rating: d['目前評分'], feedbackCount: d['回饋人數'],
          comments: d['近期真實回饋 (使用｜分隔多則留言)'] ? d['近期真實回饋 (使用｜分隔多則留言)'].split('｜') : []
        })));

        setMinutes(minutesData.filter(d => d.id).map(d => ({
          id: d.id, title: d['會議名稱'], date: d['開會日期'], link: d['雲端連結 (檔案網址)'],
          tags: d['分類標籤 (使用逗號分隔)'] ? d['分類標籤 (使用逗號分隔)'].split(',').map(t => t.trim()) : []
        })));

        setDashboard({
          ohca: dashboardData.find(d => d['指標代號'] === 'OHCA') || {},
          ccf: dashboardData.find(d => d['指標代號'] === 'CCF') || {},
          proposal: dashboardData.find(d => d['指標代號'] === 'PROPOSAL') || {}
        });

        const activeAnnounce = announcementData.find(d => d['狀態'] === '顯示');
        if (activeAnnounce) {
          setAnnouncement({
            title: activeAnnounce['公告標題'],
            content: activeAnnounce['公告內容'],
            time: activeAnnounce['時間'],
            location: activeAnnounce['地點']
          });
        } else {
          setAnnouncement(null);
        }

      } catch (err) {
        console.error("資料載入失敗", err);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatabase();
  }, []);

  const renderStatusBadge = (status) => {
    switch (status) {
      case '進行中': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium inline-flex items-center"><Clock className="w-3 h-3 mr-1" />進行中</span>;
      case '待啟動': return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium inline-flex items-center"><AlertCircle className="w-3 h-3 mr-1" />待啟動</span>;
      case '已完成': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium inline-flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" />已完成</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      <nav className="bg-slate-800 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Shield className="w-6 h-6 mr-3 text-sky-400" />
              <span className="font-bold text-xl tracking-wider hidden sm:block">七大緊急救護智庫</span>
              <span className="font-bold text-lg tracking-wider sm:hidden">七大救護智庫</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm bg-slate-700 border border-slate-600 px-3 py-1 rounded-full text-slate-200">即時資料庫模式</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 w-full lg:max-w-2xl mx-auto relative overflow-hidden">
          <button onClick={() => setActiveTab('home')} className={`flex-1 flex flex-col sm:flex-row justify-center items-center py-3 text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === 'home' ? 'bg-sky-50 text-sky-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Home className="w-5 h-5 sm:mr-2 mb-1 sm:mb-0" />智庫首頁
          </button>
          <button onClick={() => setActiveTab('projects')} className={`flex-1 flex flex-col sm:flex-row justify-center items-center py-3 text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === 'projects' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Layers className="w-5 h-5 sm:mr-2 mb-1 sm:mb-0" />實務行動
          </button>
          <button onClick={() => setActiveTab('materials')} className={`flex-1 flex flex-col sm:flex-row justify-center items-center py-3 text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === 'materials' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <BookOpen className="w-5 h-5 sm:mr-2 mb-1 sm:mb-0" />知識傳承
          </button>
          <button onClick={() => setActiveTab('report')} className={`flex-1 flex flex-col sm:flex-row justify-center items-center py-3 text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === 'report' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <MessageSquare className="w-5 h-5 sm:mr-2 mb-1 sm:mb-0" />救護告解室
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-8 min-h-[600px] relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 rounded-3xl flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-sky-100 border-t-sky-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-bold">正從您的 Google 試算表抓取最新資料...</p>
            </div>
          )}

          {loadError && !isLoading && (
            <div className="absolute inset-0 bg-white/95 z-10 rounded-3xl flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">資料庫存取被拒絕</h3>
              <p className="text-slate-600 mb-6">請確認您的 Google 試算表「共用設定」已開啟為<strong>「知道連結的任何人皆可檢視」</strong>。</p>
            </div>
          )}

          {activeTab === 'home' && !isLoading && !loadError && dashboard && (
            <div>
              {announcement && (
                <div className="bg-sky-50 border border-sky-100 rounded-2xl p-6 shadow-sm mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">最新</div>
                  <h3 className="text-lg font-bold text-sky-900 mb-2 flex items-center">
                    <Megaphone className="w-5 h-5 mr-2 text-sky-600" />{announcement.title}
                  </h3>
                  <p className="text-sky-800 text-sm mb-4 leading-relaxed opacity-90 whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  {(announcement.time || announcement.location) && (
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6 bg-white/60 p-3 rounded-xl border border-sky-100/50">
                      {announcement.time && <div className="flex items-center text-sm text-slate-700"><Calendar className="w-4 h-4 mr-2 text-sky-500" /><strong>時間:</strong> {announcement.time}</div>}
                      {announcement.location && <div className="flex items-center text-sm text-slate-700"><MapPin className="w-4 h-4 mr-2 text-sky-500" /><strong>地點:</strong> {announcement.location}</div>}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-slate-800 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-slate-400" />本月品管與智庫指標</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                <div className="border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="text-sky-600 bg-sky-50 p-2 rounded-lg"><Activity className="w-5 h-5"/></div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1"/> {dashboard.ohca['趨勢符號']}{dashboard.ohca['趨勢數值']}
                    </span>
                  </div>
                  <h3 className="text-slate-500 text-sm mt-4 font-medium">{dashboard.ohca['指標名稱'] || 'OHCA 辨識比例'}</h3>
                  <div className="text-3xl font-bold text-slate-800 mt-1">{dashboard.ohca['當月數值'] || '0'}<span className="text-lg text-slate-500 font-normal">{dashboard.ohca['單位']}</span></div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3"><div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${dashboard.ohca['當月數值']}%` }}></div></div>
                </div>

                <div className="border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="text-teal-600 bg-teal-50 p-2 rounded-lg"><Activity className="w-5 h-5"/></div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1"/> {dashboard.ccf['趨勢符號']}{dashboard.ccf['趨勢數值']}
                    </span>
                  </div>
                  <h3 className="text-slate-500 text-sm mt-4 font-medium">{dashboard.ccf['指標名稱'] || 'CCF 達標率'}</h3>
                  <div className="text-3xl font-bold text-slate-800 mt-1">{dashboard.ccf['當月數值'] || '0'}<span className="text-lg text-slate-500 font-normal">{dashboard.ccf['單位']}</span></div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3"><div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${dashboard.ccf['當月數值']}%` }}></div></div>
                </div>

                <div className="border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="text-indigo-600 bg-indigo-50 p-2 rounded-lg"><MessageSquare className="w-5 h-5"/></div>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{dashboard.proposal['趨勢數值']}</span>
                  </div>
                  <h3 className="text-slate-500 text-sm mt-4 font-medium">{dashboard.proposal['指標名稱'] || '行動提案'}</h3>
                  <div className="text-3xl font-bold text-slate-800 mt-1">{dashboard.proposal['當月數值'] || '0'}<span className="text-lg text-slate-500 font-normal"> {dashboard.proposal['單位']}</span></div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3"><div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: '100%' }}></div></div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center"><ClipboardList className="w-5 h-5 mr-2 text-slate-400" />近期會議紀錄</h2>
                </div>
                <div className="space-y-3">
                  {minutes.map(doc => (
                    <div key={doc.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-2xl hover:bg-sky-50 hover:border-sky-200 transition-colors bg-white shadow-sm">
                      <div className="flex items-start">
                        <div className="bg-slate-100 p-2 rounded-xl mr-4 text-slate-400 mt-1"><ClipboardList className="w-6 h-6" /></div>
                        <div>
                          <h3 className="font-bold text-slate-800">{doc.title}</h3>
                          <div className="flex flex-wrap items-center mt-2 gap-2">
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{doc.date}</span>
                            {doc.tags.map(tag => (
                              <span key={tag} className="text-[10px] bg-white text-slate-500 px-2 py-0.5 rounded-md border border-slate-200">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <a href={doc.link || '#'} target="_blank" rel="noopener noreferrer" className="mt-3 sm:mt-0 self-start sm:self-center text-sm font-bold text-sky-600 px-4 py-1.5 border border-sky-200 rounded-lg hover:bg-sky-600 hover:text-white transition-colors">
                        下載檢閱
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && !isLoading && !loadError && (
            <div>
              <div className="flex space-x-2 mb-8 border-b border-slate-100 pb-4 overflow-x-auto">
                <button onClick={() => setActiveSubTab('tasks')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeSubTab === 'tasks' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><FolderKanban className="inline w-4 h-4 mr-2 mb-0.5"/> 智庫任務列管</button>
                <button onClick={() => setActiveSubTab('proposals')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeSubTab === 'proposals' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Lightbulb className="inline w-4 h-4 mr-2 mb-0.5"/> 同仁實務提案</button>
                <button onClick={() => setActiveSubTab('equipment')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeSubTab === 'equipment' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><TestTube className="inline w-4 h-4 mr-2 mb-0.5"/> 裝備實測回饋</button>
              </div>

              {activeSubTab === 'tasks' && (
                <div className="grid gap-4">
                  {tasks.map(task => (
                    <div key={task.id} className="border border-slate-200 bg-white hover:border-blue-300 transition-all rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between">
                      <div className="mb-3 sm:mb-0">
                        <h3 className="font-bold text-lg text-slate-800">{task.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">專案負責:{task.assignee}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-1">追蹤期限</p>
                          <p className="text-sm font-bold text-slate-700">{task.deadline}</p>
                        </div>
                        {renderStatusBadge(task.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSubTab === 'proposals' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-slate-500">遇到有共鳴的提案,請大力點擊「我要附議」給予支持!</p>
                    <button className="flex items-center text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
                      <PlusCircle className="w-4 h-4 mr-2" /> 新增提案
                    </button>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    {proposals.map(prop => (
                      <div key={prop.id} className="border border-slate-200 rounded-2xl p-5 bg-white hover:shadow-md transition-shadow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-slate-800 text-lg">{prop.title}</h4>
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium shrink-0 ml-2">{prop.status}</span>
                          </div>
                          <p className="text-sm text-slate-500 mb-4">提案人:{prop.author} | {prop.date}</p>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                          <span className="flex items-center text-blue-600 font-bold text-lg">
                            <Lightbulb className="w-5 h-5 mr-1.5"/> {prop.likes} <span className="text-sm text-slate-500 font-normal ml-1">人支持</span>
                          </span>
                          <button
                            onClick={() => {
                              setSelectedProposalForVote(prop.title);
                              setShowVoteModal(true);
                            }}
                            className="flex items-center text-sm bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl font-bold transition-all"
                          >
                            <ThumbsUp className="w-4 h-4 mr-2"/> 我要附議
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSubTab === 'equipment' && (
                <div className="grid gap-6 sm:grid-cols-2">
                  {equipments.map(eq => (
                    <div key={eq.id} className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col bg-white">
                      <div className="bg-slate-50 border-b border-slate-100 p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-slate-800">{eq.name}</h3>
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">{eq.stage}</span>
                        </div>
                        <p className="text-sm text-slate-500">測試單位:{eq.testers}</p>
                      </div>
                      <div className="p-5 flex-grow">
                        <div className="flex items-center justify-between mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">目前評分</p>
                            <div className="flex items-center">
                              <span className="text-2xl font-black text-slate-800 mr-2">{eq.rating}</span>
                              <div className="flex text-amber-400">
                                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 text-slate-200" />
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 mb-1">回饋人數</p>
                            <p className="text-lg font-bold text-slate-700">{eq.feedbackCount} 人</p>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-700 mb-3">近期真實回饋:</h4>
                        <ul className="space-y-3">
                          {eq.comments.map((comment, idx) => (
                            <li key={idx} className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 pl-4 border-l-4 border-l-blue-400">
                              "{comment}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'materials' && !isLoading && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-2">去識別化教案與素材庫</h2>
                <p className="text-sm text-slate-500">集中管理大隊的教育訓練教材與現場特殊案例,點擊即可開啟 Google Drive 雲端資料夾。</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-6 mt-6">
                <a href="https://drive.google.com/drive/folders/1IJ-JKADLkKXwLifsrl_Z6TDmi4qvuSR6" target="_blank" rel="noopener noreferrer" className="group block border border-slate-200 rounded-3xl p-6 hover:shadow-xl transition-all bg-white relative overflow-hidden hover:border-blue-300">
                  <div className="flex items-center mb-5"><div className="bg-blue-100 p-4 rounded-2xl mr-4 text-blue-600"><FolderOpen className="w-8 h-8" /></div><h3 className="text-xl font-bold text-slate-800">教育教材分享</h3></div>
                  <p className="text-slate-500 mb-6 text-sm">收錄大隊各項常訓教材、操作指引、器材說明書與簡報檔。</p>
                  <div className="inline-flex items-center text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">開啟資料夾 <ExternalLink className="w-4 h-4 ml-2" /></div>
                </a>
                <a href="https://drive.google.com/drive/folders/1nUsdOSPXGQGeJaV0_JQSrP76DD2FD_MK" target="_blank" rel="noopener noreferrer" className="group block border border-slate-200 rounded-3xl p-6 hover:shadow-xl transition-all bg-white relative overflow-hidden hover:border-teal-300">
                  <div className="flex items-center mb-5"><div className="bg-teal-100 p-4 rounded-2xl mr-4 text-teal-600"><PlaySquare className="w-8 h-8" /></div><h3 className="text-xl font-bold text-slate-800">特殊案例分享</h3></div>
                  <p className="text-slate-500 mb-6 text-sm">包含品管小組收集的去識別化案例、罕見救護情境與經驗分享。</p>
                  <div className="inline-flex items-center text-sm font-bold text-teal-600 bg-teal-50 px-4 py-2 rounded-xl">開啟資料夾 <ExternalLink className="w-4 h-4 ml-2" /></div>
                </a>
              </div>
            </div>
          )}

          {activeTab === 'report' && !isLoading && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">救護告解室 (現場困難通報)</h2>
                  <p className="text-sm text-slate-500">非懲罰性通報。把抱怨變成改善提案,大隊智庫一起來幫忙想辦法。</p>
                </div>
              </div>
              <div className="w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-inner" style={{ height: '700px' }}>
                <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSfzy5V4FXwj2STuzePHBlnYKRrO5D4rr3qSjK71iXSAMMZ3Yg/viewform?embedded=true" width="100%" height="100%" frameBorder="0" title="救護告解室表單">載入中...</iframe>
              </div>
            </div>
          )}
        </div>
      </div>

      {showVoteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[80vh] max-h-[600px]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <ThumbsUp className="w-5 h-5 mr-2 text-blue-600"/>
                支持提案
              </h3>
              <button onClick={() => setShowVoteModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <p className="text-sm text-blue-800">
                您正準備支持:<strong>{selectedProposalForVote}</strong><br/>
                請在下方表單中選擇該提案送出,系統將自動累計支持數。
              </p>
            </div>
            <div className="flex-grow w-full bg-white">
              <iframe src={VOTE_FORM_URL} width="100%" height="100%" frameBorder="0" title="支持提案表單">載入中...</iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
