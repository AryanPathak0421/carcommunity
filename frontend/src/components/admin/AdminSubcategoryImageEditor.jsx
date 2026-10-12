import { patchAdminLabourCategory } from '../../api/adminLabourCategoriesApi.js'
import { AdminCategoryImageEditor } from './AdminCategoryImageEditor.jsx'

export function AdminSubcategoryImageEditor({ category, onUpdated }) {
  return (
    <AdminCategoryImageEditor
      label="Subcategory image"
      imageUrl={category.imageUrl}
      hint="Shown on the customer home — Book by service and search tiles."
      onSave={async (imageUrl) => {
        await patchAdminLabourCategory(category._id, { imageUrl })
        onUpdated?.()
      }}
    />
  )
}
