import React, { useState, useEffect, useMemo } from 'react';
import { LinkType, generateUUID } from '../lib/db';
import { Plus, Link as LinkIcon, Search, Trash2, ExternalLink, Edit2, Check, X, Tag, Globe, LayoutGrid, List, AlertTriangle } from 'lucide-react';

function FaviconImage({ url }: { url: string }) {
  const [error, setError] = useState(false);
  
  const domain = useMemo(() => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }, [url]);

  if (error || !domain) {
    return <Globe size={15} className="text-zinc-400 shrink-0" />;
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      onError={() => setError(true)}
      className="w-4 h-4 rounded shrink-0 object-contain"
    />
  );
}

export default function LinksSection({ db, user }: { db: any, user: any }) {
  const [links, setLinks] = useState<LinkType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // New link state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newLabelsRaw, setNewLabelsRaw] = useState('');

  // Editing modal state
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editLabelsRaw, setEditLabelsRaw] = useState('');

  // Delete confirmation modal state
  const [deletingLinkConfirm, setDeletingLinkConfirm] = useState<LinkType | null>(null);

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

    let validUrl = newUrl.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    const labelArray = newLabelsRaw
      .split(',')
      .map(lbl => lbl.trim())
      .filter(lbl => lbl.length > 0);

    try {
      const newLink: LinkType = {
        id: generateUUID(),
        userId: user.uid,
        name: newName.trim(),
        url: validUrl,
        label: labelArray[0] || '',
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

  const handleStartEditing = (link: LinkType, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingLink(link);
    setEditName(link.name);
    setEditUrl(link.url);
    const linkLabels = link.labels || (link.label ? [link.label] : []);
    setEditLabelsRaw(linkLabels.join(', '));
  };

  const handleCancelEditing = () => {
    setEditingLink(null);
    setEditName('');
    setEditUrl('');
    setEditLabelsRaw('');
  };

  const handleUpdateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !editingLink || !editName || !editUrl) return;

    let validUrl = editUrl.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    const labelArray = editLabelsRaw
      .split(',')
      .map(lbl => lbl.trim())
      .filter(lbl => lbl.length > 0);

    try {
      const doc = await db.links.findOne(editingLink.id).exec();
      if (doc) {
        await doc.patch({
          name: editName.trim(),
          url: validUrl,
          label: labelArray[0] || '',
          labels: labelArray,
          updatedAt: Date.now()
        });
        handleCancelEditing();
      }
    } catch (err) {
      console.error('Error updating link:', err);
      alert('Failed to update link.');
    }
  };

  const handlePromptDeleteLink = (link: LinkType, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingLinkConfirm(link);
  };

  const handleConfirmDeleteLink = async () => {
    if (!db || !deletingLinkConfirm) return;
    try {
      const doc = await db.links.findOne(deletingLinkConfirm.id).exec();
      if (doc) await doc.remove();
      setDeletingLinkConfirm(null);
      if (editingLink?.id === deletingLinkConfirm.id) {
        handleCancelEditing();
      }
    } catch (err) {
      console.error('Error deleting link:', err);
    }
  };

  const formatDomainDisplay = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^https?:\/\//, '').split('/')[0];
    }
  };

  return (
    <div id="quick-links-section" className="mt-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <LinkIcon size={18} className="text-blue-600 dark:text-blue-400" />
            Your Quick Links
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage bookmarks, references, and financial sheets</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-grow sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search links..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-zinc-900 focus:border-transparent dark:text-white transition min-h-[36px]"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              title="Compact Grid View"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Dense List View"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <List size={15} />
            </button>
          </div>

          {/* Add Link Button */}
          <button 
            id="add-link-toggle"
            onClick={() => {
              setIsAdding(!isAdding);
              setNewName('');
              setNewUrl('');
              setNewLabelsRaw('');
            }}
            className="flex shrink-0 items-center justify-center min-h-[36px] bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <Plus size={14} className="mr-1.5" />
            <span>{isAdding ? 'Cancel' : 'Add Link'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tags */}
      {allLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Tag size={11} /> Filter:
          </span>
          <button
            onClick={() => setSelectedLabel(null)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer min-h-[28px] ${
              selectedLabel === null
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            All
          </button>
          {allLabels.map(label => (
            <button
              key={label}
              onClick={() => setSelectedLabel(selectedLabel === label ? null : label)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer min-h-[28px] ${
                selectedLabel === label
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              #{label}
            </button>
          ))}
        </div>
      )}

      {/* Add Link Form */}
      {isAdding && (
        <form onSubmit={handleAddLink} id="add-link-form" className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 grid gap-3 grid-cols-1 sm:grid-cols-12 transition">
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Link Name *</label>
            <input 
              required
              autoFocus
              type="text"
              placeholder="e.g. Fidelity Brokerage"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md outline-none focus:ring-1 focus:ring-zinc-900 text-xs dark:text-white min-h-[36px]"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">URL / Link Address *</label>
            <input 
              required
              type="text"
              placeholder="e.g. fidelity.com"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md outline-none focus:ring-1 focus:ring-zinc-900 text-xs dark:text-white min-h-[36px]"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Tags (comma-separated)</label>
            <input 
              type="text"
              placeholder="e.g. Brokerage, Retirement"
              value={newLabelsRaw}
              onChange={e => setNewLabelsRaw(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md outline-none focus:ring-1 focus:ring-zinc-900 text-xs dark:text-white min-h-[36px]"
            />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <button 
              type="submit"
              className="w-full bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-50 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-bold flex items-center justify-center min-h-[36px] rounded-md text-xs transition cursor-pointer"
            >
              Save Link
            </button>
          </div>
        </form>
      )}

      {/* Links Display */}
      {filteredLinks.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
          {searchQuery || selectedLabel ? 'No links found matching filter.' : 'No quick links created yet. Click "Add Link" to create one.'}
        </div>
      ) : viewMode === 'grid' ? (
        /* Compact Grid View: 1 to 4 columns depending on screen size */
        <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredLinks.map(link => {
            const linkLabels = link.labels || (link.label ? [link.label] : []);

            return (
              <div 
                key={link.id} 
                className="group relative bg-zinc-50/50 hover:bg-white dark:bg-zinc-950/40 dark:hover:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500/50 p-2.5 px-3 rounded-lg transition-all shadow-xs flex flex-col justify-between"
              >
                {/* Header row: Favicon + Title + Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FaviconImage url={link.url} />
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition truncate leading-snug"
                      title={link.name}
                    >
                      {link.name}
                    </a>
                  </div>

                  {/* Actions: Edit, Delete, & External Link */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button 
                      onClick={(e) => handleStartEditing(link, e)}
                      className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center"
                      title="Edit Quick Link"
                      aria-label="Edit quick link"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      onClick={(e) => handlePromptDeleteLink(link, e)}
                      className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center"
                      title="Delete Quick Link"
                      aria-label="Delete quick link"
                    >
                      <Trash2 size={13} />
                    </button>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center"
                      title="Open Link in New Tab"
                      aria-label="Open link"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                {/* Subtitle / Domain & Tags */}
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-zinc-400 dark:text-zinc-500">
                  <span className="truncate max-w-[140px] font-mono" title={link.url}>
                    {formatDomainDisplay(link.url)}
                  </span>

                  {linkLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 shrink-0">
                      {linkLabels.slice(0, 2).map((tag, tIdx) => (
                        <span 
                          key={tIdx} 
                          onClick={() => setSelectedLabel(selectedLabel === tag ? null : tag)}
                          className={`px-1 py-0.2 text-[9px] font-semibold rounded border cursor-pointer transition ${
                            selectedLabel === tag 
                              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900'
                              : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-400'
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                      {linkLabels.length > 2 && (
                        <span className="text-[9px] font-bold text-zinc-400">+{linkLabels.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Dense List View */
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200/80 dark:border-zinc-800 rounded-lg overflow-hidden">
          {filteredLinks.map(link => {
            const linkLabels = link.labels || (link.label ? [link.label] : []);

            return (
              <div 
                key={link.id} 
                className="group flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <FaviconImage url={link.url} />
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition truncate"
                  >
                    {link.name}
                  </a>
                  <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline truncate max-w-[160px]">
                    {formatDomainDisplay(link.url)}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Tags */}
                  {linkLabels.length > 0 && (
                    <div className="hidden md:flex gap-1">
                      {linkLabels.map((tag, tIdx) => (
                        <span 
                          key={tIdx} 
                          onClick={() => setSelectedLabel(selectedLabel === tag ? null : tag)}
                          className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border cursor-pointer transition ${
                            selectedLabel === tag 
                              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900'
                              : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800'
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action controls */}
                  <div className="flex items-center gap-0.5">
                    <button 
                      onClick={(e) => handleStartEditing(link, e)}
                      className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center"
                      title="Edit Quick Link"
                      aria-label="Edit quick link"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      onClick={(e) => handlePromptDeleteLink(link, e)}
                      className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center"
                      title="Delete Quick Link"
                      aria-label="Delete quick link"
                    >
                      <Trash2 size={13} />
                    </button>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-1 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center"
                      title="Open link in new tab"
                      aria-label="Open link"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLinkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setDeletingLinkConfirm(null)}
          />
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                  Delete Quick Link
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Are you sure you want to delete <strong className="text-zinc-900 dark:text-zinc-200">"{deletingLinkConfirm.name}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setDeletingLinkConfirm(null)}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer min-h-[36px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLink}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs transition cursor-pointer min-h-[36px] flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Delete Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quick Link Modal */}
      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity" 
            onClick={handleCancelEditing}
          />
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-md w-full relative z-10 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Edit2 size={16} className="text-blue-600 dark:text-blue-400" />
                Edit Quick Link
              </h3>
              <button 
                onClick={handleCancelEditing}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateLink} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Link Name *
                </label>
                <input 
                  required
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs dark:text-white outline-none focus:ring-1 focus:ring-blue-500 min-h-[38px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  URL / Address *
                </label>
                <input 
                  required
                  type="text"
                  value={editUrl}
                  onChange={e => setEditUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs dark:text-white outline-none focus:ring-1 focus:ring-blue-500 min-h-[38px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Tags (comma-separated)
                </label>
                <input 
                  type="text"
                  value={editLabelsRaw}
                  placeholder="e.g. Tax, Budget, Retirement"
                  onChange={e => setEditLabelsRaw(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs dark:text-white outline-none focus:ring-1 focus:ring-blue-500 min-h-[38px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => handlePromptDeleteLink(editingLink)}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition cursor-pointer"
                  >
                    <Check size={14} />
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
