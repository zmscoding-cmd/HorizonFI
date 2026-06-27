import React, { useState, useEffect, useMemo } from 'react';
import { LinkType, generateUUID } from '../lib/db';
import { Plus, Link as LinkIcon, Search, Trash2, ExternalLink, Edit2, Check, X, Tag } from 'lucide-react';

export default function LinksSection({ db, user }: { db: any, user: any }) {
  const [links, setLinks] = useState<LinkType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  
  // New link form state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newLabelsRaw, setNewLabelsRaw] = useState('');

  // Inline editing state
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editLabelsRaw, setEditLabelsRaw] = useState('');

  useEffect(() => {
    if (!db) return;
    
    // Subscribe to links
    const sub = db.links.find().$.subscribe((linksData: any[]) => {
      setLinks(linksData.map(l => l.toJSON()));
    });
    
    return () => sub.unsubscribe();
  }, [db]);

  // Extract all unique labels present across all links
  const allLabels = useMemo(() => {
    const labelsSet = new Set<string>();
    links.forEach(link => {
      if (link.label) labelsSet.add(link.label.trim());
      if (link.labels) {
        link.labels.forEach(lbl => {
          if (lbl.trim()) labelsSet.add(lbl.trim());
        });
      }
    });
    return Array.from(labelsSet).sort();
  }, [links]);

  const filteredLinks = useMemo(() => {
    let result = links;
    
    // Filter by tag pill if selected
    if (selectedLabel) {
      result = result.filter(link => {
        const linkLabels = link.labels || (link.label ? [link.label] : []);
        return linkLabels.some(l => l.toLowerCase() === selectedLabel.toLowerCase());
      });
    }

    if (!searchQuery.trim()) return result;
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(link => {
      const matchName = link.name.toLowerCase().includes(lowerQuery);
      const matchUrl = link.url.toLowerCase().includes(lowerQuery);
      const linkLabels = link.labels || (link.label ? [link.label] : []);
      const matchLabelState = linkLabels.some(l => l.toLowerCase().includes(lowerQuery));
      return matchName || matchUrl || matchLabelState;
    });
  }, [links, searchQuery, selectedLabel]);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !newName || !newUrl) return;

    let validUrl = newUrl;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    // Split by comma & trim labels
    const labelArray = newLabelsRaw
      .split(',')
      .map(lbl => lbl.trim())
      .filter(lbl => lbl.length > 0);

    try {
      const newLink: LinkType = {
        id: generateUUID(),
        userId: user.uid,
        name: newName,
        url: validUrl,
        label: labelArray[0] || '', // backward compatible single-label field
        labels: labelArray,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await db.links.insert(newLink);
      setNewName('');
      setNewUrl('');
      setNewLabelsRaw('');
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding link:', err);
      alert('Failed to add link.');
    }
  };

  const handleStartEditing = (link: LinkType) => {
    setEditingLinkId(link.id);
    setEditName(link.name);
    setEditUrl(link.url);
    const linkLabels = link.labels || (link.label ? [link.label] : []);
    setEditLabelsRaw(linkLabels.join(', '));
  };

  const handleCancelEditing = () => {
    setEditingLinkId(null);
    setEditName('');
    setEditUrl('');
    setEditLabelsRaw('');
  };

  const handleUpdateLink = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!db || !editName || !editUrl) return;

    let validUrl = editUrl;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    const labelArray = editLabelsRaw
      .split(',')
      .map(lbl => lbl.trim())
      .filter(lbl => lbl.length > 0);

    try {
      const doc = await db.links.findOne(id).exec();
      if (doc) {
        await doc.patch({
          name: editName,
          url: validUrl,
          label: labelArray[0] || '',
          labels: labelArray,
          updatedAt: Date.now()
        });
        setEditingLinkId(null);
      }
    } catch (err) {
      console.error('Error updating link:', err);
      alert('Failed to update link.');
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!db) return;
    try {
      const doc = await db.links.findOne(id).exec();
      if (doc) await doc.remove();
    } catch (err) {
      console.error('Error deleting link:', err);
    }
  };

  return (
    <div id="quick-links-section" className="mt-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <LinkIcon size={20} className="text-zinc-400" />
            Your Quick Links
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Manage bookmarks, references, and financial sheets securely</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search links..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent dark:text-white transition min-h-[44px]"
            />
          </div>
          <button 
            id="add-link-toggle"
            onClick={() => {
              setIsAdding(!isAdding);
              setNewName('');
              setNewUrl('');
              setNewLabelsRaw('');
            }}
            className="flex shrink-0 items-center justify-center min-h-[44px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            <Plus size={16} className="sm:mr-2" />
            <span>{isAdding ? 'Cancel' : 'Add Link'}</span>
          </button>
        </div>
      </div>

      {allLabels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mr-2 flex items-center gap-1">
            <Tag size={12} /> Filter tags:
          </span>
          <button
            onClick={() => setSelectedLabel(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer min-h-[32px] ${
              selectedLabel === null
                ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900'
                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            All
          </button>
          {allLabels.map(label => (
            <button
              key={label}
              onClick={() => setSelectedLabel(selectedLabel === label ? null : label)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer min-h-[32px] ${
                selectedLabel === label
                  ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              #{label}
            </button>
          ))}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAddLink} id="add-link-form" className="mb-6 p-5 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800 grid gap-4 grid-cols-1 sm:grid-cols-12 transition duration-200">
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Link Name *</label>
            <input 
              required
              autoFocus
              type="text"
              placeholder="e.g. Fidelity Brokerage"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-1 focus:ring-zinc-900 text-sm dark:text-white min-h-[44px]"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">URL / Link Address *</label>
            <input 
              required
              type="text"
              placeholder="e.g. fidelity.com"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-1 focus:ring-zinc-900 text-sm dark:text-white min-h-[44px]"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Labels / Tags (comma-separated)</label>
            <input 
              type="text"
              placeholder="e.g. Brokerage, Retirement, Taxable"
              value={newLabelsRaw}
              onChange={e => setNewLabelsRaw(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-1 focus:ring-zinc-900 text-sm dark:text-white min-h-[44px]"
            />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <button 
              type="submit"
              className="w-full bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-50 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-bold flex items-center justify-center min-h-[44px] rounded-lg text-sm transition cursor-pointer"
            >
              Save Link
            </button>
          </div>
        </form>
      )}

      {filteredLinks.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 text-sm border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          {searchQuery || selectedLabel ? 'No links found matching your current filter filters.' : 'No quick links created yet. Click "Add Link" to build your financial directory.'}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLinks.map(link => {
            const isEditing = editingLinkId === link.id;
            const linkLabels = link.labels || (link.label ? [link.label] : []);

            if (isEditing) {
              return (
                <form 
                  key={link.id} 
                  onSubmit={(e) => handleUpdateLink(e, link.id)}
                  id={`edit-link-form-${link.id}`}
                  className="bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 p-4 rounded-xl flex flex-col gap-3 transition shadow-md"
                >
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Name</label>
                    <input 
                      required
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-xs dark:text-white min-h-[36px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">URL</label>
                    <input 
                      required
                      type="text"
                      value={editUrl}
                      onChange={e => setEditUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-xs dark:text-white min-h-[36px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Tags (comma-separated)</label>
                    <input 
                      type="text"
                      value={editLabelsRaw}
                      onChange={e => setEditLabelsRaw(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-xs dark:text-white min-h-[36px]"
                    />
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button 
                      type="submit"
                      className="flex-1 bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-50 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-bold flex items-center justify-center gap-1 min-h-[36px] rounded text-xs transition cursor-pointer"
                      title="Save modifications"
                    >
                      <Check size={14} /> Save
                    </button>
                    <button 
                      type="button"
                      onClick={handleCancelEditing}
                      className="flex-grow bg-zinc-200 hover:bg-zinc-350 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center gap-1 min-h-[36px] rounded text-xs transition cursor-pointer"
                      title="Discard modification"
                    >
                      <X size={14} /> Discard
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div 
                key={link.id} 
                className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 p-4 rounded-xl flex flex-col transition shadow-sm hover:shadow-md"
              >
                 <div className="flex justify-between items-start mb-4">
                   <h3 className="font-bold text-zinc-900 dark:text-zinc-100 break-words whitespace-normal leading-snug"><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5 align-middle"><span>{link.name}</span><ExternalLink size={13} className="shrink-0" /></a></h3>
                   <div className="absolute top-3.5 right-3.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                     <button 
                        onClick={() => handleStartEditing(link)}
                        className="p-1 px-2 text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200 transition bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-805 rounded border border-zinc-200/50 dark:border-zinc-800 min-h-[32px] flex items-center justify-center"
                        aria-label="Edit link name, URL, or labels"
                        title="Edit Quick Link"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-1 px-2 text-zinc-400 hover:text-red-500 transition bg-zinc-50 hover:bg-red-50/50 dark:bg-zinc-950 dark:hover:bg-red-950/20 rounded border border-zinc-200/50 dark:border-zinc-800 min-h-[32px] flex items-center justify-center"
                        aria-label="Delete this link permanently"
                        title="Delete Quick Link"
                      >
                        <Trash2 size={13} />
                      </button>
                   </div>
                 </div>
                 
                 <a 
                   href={link.url} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="hidden"
                 >
                   <ExternalLink size={12} className="shrink-0" />
                   {link.url}
                 </a>

                 <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                   {linkLabels.length > 0 ? (
                     linkLabels.map((tag, tIdx) => (
                       <span 
                         key={tIdx} 
                         onClick={() => setSelectedLabel(selectedLabel === tag ? null : tag)}
                         className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border cursor-pointer transition ${
                           selectedLabel === tag 
                             ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-950 dark:border-zinc-100'
                             : 'bg-zinc-50 dark:bg-zinc-950/30 text-zinc-500 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-650'
                         }`}
                       >
                         #{tag}
                       </span>
                     ))
                   ) : (
                     <span className="text-[10px] text-zinc-400 italic">No tags</span>
                   )}
                 </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

