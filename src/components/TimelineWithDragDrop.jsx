import { useState } from 'react'
import { Clock, Edit2, Trash2 } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export default function TimelineWithDragDrop({ 
  items = [], 
  canEdit, 
  onEdit, 
  onDelete, 
  onReorder 
}) {
  const handleDragEnd = (result) => {
    if (!result.destination) return
    
    const newItems = Array.from(items)
    const [removed] = newItems.splice(result.source.index, 1)
    newItems.splice(result.destination.index, 0, removed)
    
    // Update order numbers
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index + 1
    }))
    
    onReorder(reorderedItems)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="timeline">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-4"
          >
            {items.map((item, index) => (
              <Draggable 
                key={item.id} 
                draggableId={item.id} 
                index={index}
                isDragDisabled={!canEdit}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`card-premium p-6 transition-shadow ${
                      snapshot.isDragging ? 'shadow-2xl' : ''
                    } ${canEdit ? 'cursor-move' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 md:w-16 h-12 md:h-16 bg-cowc-gold/10 rounded-full flex items-center justify-center">
                          <Clock className="w-6 md:w-8 h-6 md:h-8 text-cowc-gold" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-semibold text-cowc-dark">{item.title}</h4>
                          <span className="text-cowc-gold font-semibold text-sm md:text-base">{item.time}</span>
                        </div>
                        {item.description && (
                          <p className="text-cowc-gray text-sm md:text-base">{item.description}</p>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit(item)}
                            className="p-2 hover:bg-cowc-cream rounded-lg"
                          >
                            <Edit2 className="w-4 h-4 text-cowc-dark" />
                          </button>
                          <button
                            onClick={() => onDelete(item.id)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
